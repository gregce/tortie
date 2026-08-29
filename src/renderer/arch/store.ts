/**
 * Architecture view state: what the contract says, what Tortie made of it, and
 * nothing else.
 *
 * FIVE RULES, and every one of them is a refusal from research 49 rather than
 * a preference.
 *
 *  1. **Nothing here polls and nothing here announces.** Main re-checks on the
 *     watcher's own fan-out and sends `arch:checked`; this store applies the
 *     answer. There is no toast, no rail badge and no dot on a session tab. A
 *     verdict that changed while you were reading a file is a number that
 *     moved, not an interruption.
 *  2. **NO VERDICT EVER TOUCHES A SESSION'S STATUS.** Nothing in this file
 *     imports the sessions slice for a write, and nothing in it may. Status
 *     semantics belong to session behaviour and this surface is not session
 *     behaviour.
 *  3. **A failed read never blanks the panel.** A contract file that will not
 *     parse is a dropped row with the file, the field and the reason on
 *     screen, beside every row that did load.
 *  4. **Nothing here writes a file; every write is main's, behind its own
 *     gate.** Phase 158 rewrote this rule from "Tortie never writes it".
 *     Drafting asks main to write the skeleton, enriching asks main to run
 *     the one confirmed agent, and accepting a divergence asks main to
 *     append one row to `baseline.json`. All three are a person's gesture,
 *     main validates whole before writing, and this store holds no path and
 *     composes no bytes: it asks, and it reads back what landed.
 *  5. **The first check is a question, never a stale verdict.** `firstCheck`
 *     renders as "Not checked yet" and never as "changed", because a run that
 *     has not finished has nothing to say about whether anything moved.
 *
 * WHAT IS NOT HERE, so a later round has something to point at: no payload
 * composer, no send to a session, and no count badge for any surface outside
 * this view to draw. Layout positions ARRIVED in Phase 162 as the kept
 * canvas, but only as a mirror of `arch.db`, whose loss costs a re-layout
 * and nothing else. The SELECTION lives here (Phase 64
 * widened it to a list) and the sending does not: composing and delivering are
 * in ./deliver.ts and ./picker.ts, behind one guard, so this file still writes
 * nothing to any session.
 */

import { create } from 'zustand';
import type {
  ArchComponent,
  ArchCoverageCounts,
  ArchEdge,
  ArchFreshness,
  ArchProblem,
  ArchVerdict
} from '@shared/arch';
// The channel ANSWER shapes, which are the ipc domain's own and not the
// repository's records.
import type { ArchCheckResult, ArchLoadResult } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { localPathOf, sameTarget } from '@shared/workspace-target';
import { gmuxBridge } from '../bridge';
import { useApp } from '../state/store';
import {
  acceptBridge,
  archAvailable,
  archBridge,
  canvasBridge,
  mapBridge,
  mapPartBridge,
  passBridge,
  seedBridge
} from './bridge';
import type {
  ArchAcceptDivergenceInput,
  ArchCameraState,
  ArchMapPartResult,
  ArchMapResult,
  ArchModuleFilesResult,
  ArchNodePosition,
  ArchPassStatusResult
} from './bridge';
import { moduleFilesBridge } from './modules';
import {
  ARCH_DRILL_NO_BRIDGE,
  ARCH_DRILL_PART_ERROR,
  ARCH_MAP_ERROR,
  ARCH_MAP_NO_BRIDGE
} from './copy';

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
const NO_SELECTION: ArchSelection = Object.freeze([]);

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
  enrich(): Promise<void>;
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
  /** A component's display name, or its id when it is not in the contract. */
  nameOf(componentId: string): string;
}

/**
 * Repositories whose map should be read AGAIN the moment the read in flight
 * settles (Phase 160). Module scope rather than store state because it is
 * bookkeeping about calls, not something any surface renders.
 */
const pendingMapReads = new Set<string>();

/** The scoped twins of {@link pendingMapReads}, keyed by the entry keys. */
const pendingPartReads = new Set<string>();
const pendingModuleReads = new Set<string>();

/**
 * The ONE read fold every map read uses (extracted by the integrator, Phase
 * 161, from three copies of the same block).
 *
 * One read in flight per key. An ask that lands while one is out is NOT
 * dropped: the facts may have moved between the send and the answer, so it
 * queues exactly one follow up read, which runs when the current one
 * settles. A burst of pushes still folds to two reads. The last good value
 * stays on screen through a failed re-read, with the failure named beside
 * it, and a missing bridge is an error entry rather than a hang.
 */
async function foldedRead<V>(opts: {
  key: string;
  pending: Set<string>;
  /** True when the held entry is already loading, so this ask queues. */
  loading: boolean;
  /** The read itself, or null when the bridge is absent in this build. */
  read: (() => Promise<V>) | null;
  /** The value held before this ask, kept on screen while it runs. */
  held: V | null;
  /** The value held NOW, read after an await so a race cannot blank it. */
  latest: () => V | null;
  patch: (
    status: 'loading' | 'ready' | 'error',
    value: V | null,
    error: string | null
  ) => void;
  noBridge: string;
  fallback: string;
  /** Runs after a ready patch, for the known-false pop. */
  onReady?: (value: V) => void;
  /** The queued follow up read. */
  again: () => void;
}): Promise<void> {
  if (opts.loading) {
    opts.pending.add(opts.key);
    return;
  }
  if (opts.read === null) {
    opts.patch('error', opts.held, opts.noBridge);
    return;
  }
  opts.patch('loading', opts.held, null);
  try {
    const value = await opts.read();
    opts.patch('ready', value, null);
    opts.onReady?.(value);
  } catch (err) {
    opts.patch(
      'error',
      opts.latest(),
      err instanceof Error && err.message.length > 0
        ? err.message
        : opts.fallback
    );
  }
  if (opts.pending.delete(opts.key)) opts.again();
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
 * result of getSnapshot should be cached". Every empty answer below hands back
 * this one frozen array instead.
 */
const NONE: readonly never[] = Object.freeze([]);

function errorText(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) return err.message;
  return 'The contract could not be read.';
}

/**
 * PHASE 162. The camera write-at-rest debounce (spec open question 5): keep
 * calls land in memory immediately and the database write fires once the
 * camera has been still for this long. Inertia glides for a few hundred
 * milliseconds; one write per rest is the contract, one per frame is the
 * defect this exists to prevent.
 *
 * Module scope rather than store state because it is bookkeeping about
 * calls, the `pendingMapReads` precedent. A camera lost to a quit inside the
 * window costs the next open one fit, on a database whose loss whole costs a
 * re-layout, so no flush-on-quit machinery is warranted.
 */
const CAMERA_SAVE_REST_MS = 400;
const cameraSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleCameraSave(
  repoPath: string,
  scope: string,
  camera: ArchCameraState
): void {
  const api = canvasBridge();
  if (api === null) return;
  const key = canvasKey(repoPath, scope);
  const held = cameraSaveTimers.get(key);
  if (held !== undefined) clearTimeout(held);
  cameraSaveTimers.set(
    key,
    setTimeout(() => {
      cameraSaveTimers.delete(key);
      // Fire and forget: a refused write is logged in main with the field
      // named, and the in-memory camera above is already what draws.
      void api
        .setCamera({ cwd: repoPath, scope, camera })
        .catch(() => undefined);
    }, CAMERA_SAVE_REST_MS)
  );
}

/** The one shape every pass patch goes through, so an entry is never torn. */
type PassSetter = (
  fn: (s: ArchViewState) => Pick<ArchViewState, 'passes'>
) => void;

function patchPass(
  set: PassSetter,
  cwd: string,
  patch: Partial<ArchPassEntry>
): void {
  set((s) => {
    const held = s.passes[cwd] ?? { status: null, refusal: null };
    return { passes: { ...s.passes, [cwd]: { ...held, ...patch } } };
  });
}

/**
 * The held status marked running the moment the started event lands, so the
 * face says so without waiting a round trip. A pass that started was chosen,
 * whether or not this window ever read the status, and whether or not the
 * status it holds predates the choice: main gated the spawn on the choice,
 * so `chosen` is true by the fact of the event. The Phase 158 verifier
 * watched a face keep saying "pick one in Settings" beside the spinner of
 * the run that choice had started, because this kept the stale false.
 */
function runningStatus(
  held: ArchPassStatusResult | null,
  cwd: string
): ArchPassStatusResult {
  return held === null
    ? { cwd, running: true, suspended: null, chosen: true, lastRun: null }
    : { ...held, running: true, chosen: true };
}

export const useArch = create<ArchViewState>((set, get) => ({
  target: null,
  status: 'idle',
  load: null,
  lastCheck: null,
  checking: false,
  progress: null,
  error: null,
  selected: NO_SELECTION,
  drafting: false,
  passes: {},
  enriching: false,
  maps: {},
  drills: {},
  canvas: {},
  partMaps: {},
  moduleViews: {},

  syncProject(target) {
    if (target !== null && sameTarget(get().target, target)) return;
    set({
      target,
      load: null,
      lastCheck: null,
      progress: null,
      error: null,
      selected: NO_SELECTION,
      status: target === null ? 'idle' : 'loading'
    });
    if (target !== null) void get().refresh();
  },

  async ensureLoaded(target) {
    if (target === null) return;
    if (!sameTarget(get().target, target)) {
      set({
        target,
        load: null,
        lastCheck: null,
        progress: null,
        error: null,
        selected: NO_SELECTION,
        status: 'loading'
      });
    }
    if (get().load !== null) return;
    await get().refresh();
  },

  async refresh() {
    const target = get().target;
    if (target === null) return;
    if (!archAvailable()) {
      set({ status: 'unavailable' });
      return;
    }
    const cwd = localPathOf(target);
    if (cwd === null) {
      // Reading a contract on another computer is not in this phase, and the
      // view says that rather than drawing an empty state that would read as
      // "this repository has no contract".
      set({ status: 'elsewhere' });
      return;
    }
    const api = archBridge();
    if (api === null) {
      set({ status: 'unavailable' });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const load = await api.load({ cwd });
      // The project may have changed under a slow read. Land nothing then.
      if (!sameTarget(get().target, target)) return;
      set({ load, lastCheck: null, status: 'ready', error: null });
    } catch (err) {
      if (!sameTarget(get().target, target)) return;
      set({ status: 'error', error: errorText(err) });
    }
  },

  async check() {
    const target = get().target;
    const api = archBridge();
    if (target === null || api === null || get().checking) return;
    const cwd = localPathOf(target);
    if (cwd === null || typeof api.check !== 'function') return;
    set({ checking: true, progress: null });
    try {
      const result = await api.check({ cwd });
      if (!sameTarget(get().target, target)) return;
      set({ lastCheck: result, checking: false, progress: null });
    } catch (err) {
      if (!sameTarget(get().target, target)) return;
      set({ checking: false, progress: null, error: errorText(err) });
    }
  },

  select(id) {
    set({ selected: id === null ? NO_SELECTION : [id] });
  },

  toggleSelected(id) {
    const current = get().selected;
    const next = current.includes(id)
      ? current.filter((s2) => s2 !== id)
      : [...current, id];
    set({ selected: next.length === 0 ? NO_SELECTION : next });
  },

  selectAll(ids) {
    set({ selected: ids.length === 0 ? NO_SELECTION : [...ids] });
  },

  focused() {
    const { selected } = get();
    return selected.length === 0 ? null : (selected[selected.length - 1] ?? null);
  },

  async loadMap(repoPath) {
    const held = get().maps[repoPath];
    const api = mapBridge();
    await foldedRead<ArchMapResult>({
      key: repoPath,
      pending: pendingMapReads,
      loading: held?.status === 'loading',
      read: api === null ? null : () => api.map({ cwd: repoPath }),
      held: held?.model ?? null,
      latest: () => get().maps[repoPath]?.model ?? null,
      patch: (status, model, error) => {
        set((s) => ({ maps: { ...s.maps, [repoPath]: { status, model, error } } }));
      },
      noBridge: ARCH_MAP_NO_BRIDGE,
      fallback: ARCH_MAP_ERROR,
      again: () => void get().loadMap(repoPath)
    });
  },

  mapFor(repoPath) {
    return get().maps[repoPath] ?? null;
  },

  drillFor(repoPath) {
    return get().drills[repoPath] ?? DRILL_HOME;
  },

  drillInto(repoPath, groupId, groupLabel) {
    set((s) => drillPatch(s, repoPath, { level: 2, groupId, groupLabel }));
    void get().loadPartMap(repoPath, groupId);
  },

  drillIntoModule(repoPath, moduleDir, moduleLabel) {
    const d = get().drillFor(repoPath);
    // A module belongs to a part. With no part drilled there is nothing this
    // gesture could scope, so it does nothing rather than inventing a level.
    if (d.level === 1) return;
    set((s) =>
      drillPatch(s, repoPath, {
        level: 3,
        groupId: d.groupId,
        groupLabel: d.groupLabel,
        moduleDir,
        moduleLabel
      })
    );
    void get().loadModuleView(repoPath, moduleDir);
  },

  drillUp(repoPath) {
    const d = get().drillFor(repoPath);
    if (d.level === 1) return;
    const next: ArchDrill =
      d.level === 3
        ? { level: 2, groupId: d.groupId, groupLabel: d.groupLabel }
        : DRILL_HOME;
    set((s) => drillPatch(s, repoPath, next));
  },

  drillHome(repoPath) {
    if (get().drills[repoPath] === undefined) return;
    set((s) => drillPatch(s, repoPath, DRILL_HOME));
  },

  async loadPartMap(repoPath, groupId) {
    const key = partKey(repoPath, groupId);
    const held = get().partMaps[key];
    const api = mapPartBridge();
    await foldedRead<ArchMapPartResult>({
      key,
      pending: pendingPartReads,
      loading: held?.status === 'loading',
      read: api === null ? null : () => api.mapPart({ cwd: repoPath, groupId }),
      held: held?.model ?? null,
      latest: () => get().partMaps[key]?.model ?? null,
      patch: (status, model, error) => {
        set((s) => ({ partMaps: { ...s.partMaps, [key]: { status, model, error } } }));
      },
      noBridge: ARCH_DRILL_NO_BRIDGE,
      fallback: ARCH_DRILL_PART_ERROR,
      onReady: (model) => {
        // The facts moved under the drill and this part is not in the
        // partition any more. The drill pops to the deepest level that still
        // resolves, which is the whole map: never a crash, never a frozen
        // scope drawn as truth.
        if (!model.known) {
          const d = get().drillFor(repoPath);
          if (d.level !== 1 && d.groupId === groupId) {
            set((s) => drillPatch(s, repoPath, DRILL_HOME));
          }
        }
      },
      again: () => void get().loadPartMap(repoPath, groupId)
    });
  },

  partMapFor(repoPath, groupId) {
    return get().partMaps[partKey(repoPath, groupId)] ?? null;
  },

  async loadModuleView(repoPath, moduleDir) {
    const key = moduleKey(repoPath, moduleDir);
    const held = get().moduleViews[key];
    const api = moduleFilesBridge();
    await foldedRead<ArchModuleFilesResult>({
      key,
      pending: pendingModuleReads,
      loading: held?.status === 'loading',
      read:
        api === null
          ? null
          : () => api.moduleFiles({ cwd: repoPath, dir: moduleDir }),
      held: held?.result ?? null,
      latest: () => get().moduleViews[key]?.result ?? null,
      patch: (status, result, error) => {
        set((s) => ({
          moduleViews: { ...s.moduleViews, [key]: { status, result, error } }
        }));
      },
      noBridge: ARCH_DRILL_NO_BRIDGE,
      fallback: ARCH_DRILL_PART_ERROR,
      onReady: (result) => {
        // The folder names no tracked file any more: the facts moved under
        // the drill. Pop one rung to the part, which still resolves, rather
        // than drawing an empty scope as truth.
        if (!result.known) {
          const d = get().drillFor(repoPath);
          if (d.level === 3 && d.moduleDir === moduleDir) {
            set((s) =>
              drillPatch(s, repoPath, {
                level: 2,
                groupId: d.groupId,
                groupLabel: d.groupLabel
              })
            );
          }
        }
      },
      again: () => void get().loadModuleView(repoPath, moduleDir)
    });
  },

  moduleViewFor(repoPath, moduleDir) {
    return get().moduleViews[moduleKey(repoPath, moduleDir)] ?? null;
  },

  async loadCanvas(repoPath, scope) {
    const key = canvasKey(repoPath, scope);
    // Once per window per scope: the held entry IS the answer, and the only
    // other writer of these rows is this window's own keep calls, which
    // update the held entry as they write. A second window's writes are not
    // watched, deliberately: two cameras over one scope is a race nobody
    // wins, and the last one to rest is the one that is kept.
    if (get().canvas[key] !== undefined) return;
    const api = canvasBridge();
    if (api === null) {
      // An older preload keeps nothing. Ready with nulls: the drawing
      // computes its fit and its layout fresh, the first-run path.
      set((s) => ({
        canvas: {
          ...s.canvas,
          [key]: { status: 'ready', camera: null, positions: null }
        }
      }));
      return;
    }
    set((s) => ({
      canvas: {
        ...s.canvas,
        [key]: { status: 'loading', camera: null, positions: null }
      }
    }));
    try {
      const result = await api.canvasState({ cwd: repoPath, scope });
      set((s) => ({
        canvas: {
          ...s.canvas,
          [key]: {
            status: 'ready',
            camera: result.camera,
            positions: result.positions.length === 0 ? null : result.positions
          }
        }
      }));
    } catch {
      // A failed read costs a re-fit and a re-layout, nothing else, per the
      // doctrine on arch.db. Nulls, and the drawing computes fresh.
      set((s) => ({
        canvas: {
          ...s.canvas,
          [key]: { status: 'error', camera: null, positions: null }
        }
      }));
    }
  },

  canvasFor(repoPath, scope) {
    return get().canvas[canvasKey(repoPath, scope)] ?? null;
  },

  keepCamera(repoPath, scope, camera) {
    const key = canvasKey(repoPath, scope);
    set((s) => {
      const held = s.canvas[key];
      return {
        canvas: {
          ...s.canvas,
          [key]: {
            status: held?.status ?? 'ready',
            camera,
            positions: held?.positions ?? null
          }
        }
      };
    });
    scheduleCameraSave(repoPath, scope, camera);
  },

  keepLayout(repoPath, scope, positions) {
    const key = canvasKey(repoPath, scope);
    const kept = Object.freeze([...positions]);
    set((s) => {
      const held = s.canvas[key];
      return {
        canvas: {
          ...s.canvas,
          [key]: {
            status: held?.status ?? 'ready',
            camera: held?.camera ?? null,
            positions: kept
          }
        }
      };
    });
    const api = canvasBridge();
    if (api === null) return;
    // Fire and forget: a refused write is logged in main with the field
    // named, and the held entry above still draws. Nothing here can throw at
    // the gesture that caused it.
    void api
      .setLayout({ cwd: repoPath, scope, positions: [...positions] })
      .catch(() => undefined);
  },

  async relayout(repoPath, scope) {
    const key = canvasKey(repoPath, scope);
    set((s) => {
      const held = s.canvas[key];
      if (held === undefined) return {};
      return {
        canvas: {
          ...s.canvas,
          [key]: {
            status: held.status,
            camera: held.camera,
            positions: null
          }
        }
      };
    });
    const api = canvasBridge();
    if (api === null) return;
    try {
      await api.clearLayout({ cwd: repoPath, scope });
    } catch {
      // The stored rows outlived the click. The held entry is already null,
      // so THIS window re-lays out either way, and the next open pays one
      // more click. Nothing worth surfacing over a disposable database.
    }
  },

  async draft() {
    const target = get().target;
    const api = seedBridge();
    if (target === null || api === null || get().drafting) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    set({ drafting: true });
    try {
      // MAIN WRITES, this store does not: the skeleton lands under
      // `docs/arch/` as an ordinary uncommitted change, which is the
      // operator's amendment. Source Control sees it through the watcher.
      await api.seed({ cwd });
      // Read the contract back so the cockpit draws what just landed.
      await get().refresh();
    } catch (err) {
      useApp.getState().toast('error', errorText(err), { sticky: true });
      set({ drafting: false });
      return;
    }
    set({ drafting: false });
    // THE SAME ONE GESTURE CONTINUES INTO THE PASS, where this build has
    // one. There is no second button and no fork: main holds the Settings
    // choice and the confirm gate, so with no agent picked this ask comes
    // back idle, the record says so, and the skeleton is the whole story.
    if (passBridge() !== null) await get().enrich();
  },

  async enrich() {
    const target = get().target;
    const api = passBridge();
    if (target === null || api === null || get().enriching) return;
    const cwd = localPathOf(target);
    if (cwd === null) return;
    set({ enriching: true });
    try {
      const result = await api.enrich({ cwd });
      // The refusal that stopped the gesture before any spawn is kept
      // beside the status, because it never becomes a run record and the
      // face still owes the person a sentence about it.
      patchPass(set, cwd, { refusal: result.started ? null : result.refusal });
      // Whatever happened, main's status read is the truth the face draws.
      await get().reloadPass(cwd);
      // A kept run wrote the contract, so read it back, and read the map
      // again where this window holds one: painted coverage is the proof
      // surface and the picture must move with the files. The seed a
      // contractless enrich performed lands the same way.
      if (result.run?.verdict === 'kept' || result.seeded.length > 0) {
        await get().refresh();
        if (get().maps[cwd] !== undefined) void get().loadMap(cwd);
      }
    } catch (err) {
      // A refused or failed run is a RECORD in main, not a throw, so a throw
      // here is the ask itself failing. One sentence, never a blank face.
      useApp.getState().toast('error', errorText(err), { sticky: true });
    } finally {
      set({ enriching: false });
    }
  },

  async loadPass(repoPath) {
    if (get().passes[repoPath] !== undefined) return;
    await get().reloadPass(repoPath);
  },

  async reloadPass(repoPath) {
    const api = passBridge();
    if (api === null) return;
    try {
      const status = await api.passStatus({ cwd: repoPath });
      patchPass(set, repoPath, { status });
    } catch {
      // No status is an honest state the face already draws. Nothing to say.
    }
  },

  passFor(repoPath) {
    return get().passes[repoPath] ?? null;
  },

  async acceptDivergence(input) {
    const target = get().target;
    const api = acceptBridge();
    if (target === null || api === null) {
      return { ok: false, reason: 'This build cannot accept a divergence.' };
    }
    const cwd = localPathOf(target);
    if (cwd === null) {
      return { ok: false, reason: 'This repository is not on this computer.' };
    }
    const result = await api.acceptDivergence({ cwd, ...input });
    // A kept write moved the baseline, so the strip's accepted list and the
    // verdict counts are read back rather than patched here: main is the
    // one place those live.
    if (result.ok) await get().refresh();
    return result;
  },

  subscribeEvents() {
    const api = archBridge();
    if (api === null) return () => undefined;
    const offChecked =
      typeof api.onChecked === 'function'
        ? api.onChecked((event) => {
            // Phase 160. A finished check may have moved the facts the map is
            // drawn from, so any held model for that repository is read again,
            // whether or not it belongs to the active project: a map tab for a
            // background project is still on screen. Nothing is announced; the
            // picture moves the way the numbers do.
            if (get().maps[event.cwd] !== undefined) {
              void get().loadMap(event.cwd);
            }
            reloadScopedReads(get(), event.cwd);
            const target = get().target;
            if (target === null || localPathOf(target) !== event.cwd) return;
            set({ checking: false, progress: null });
            void get().refresh();
          })
        : () => undefined;
    const offProgress =
      typeof api.onProgress === 'function'
        ? api.onProgress((p) => {
            get().applyProgress(p.cwd, p.done, p.total);
          })
        : () => undefined;
    // Phase 160. The fact base behind a map moved, being a cold scan landing
    // or a check republishing. Nothing heavy travels on the push; the store
    // asks `arch:map` again for any repository it holds a picture of, and the
    // in flight guard in `loadMap` folds a burst into one read.
    const offMapUpdated =
      typeof api.onMapUpdated === 'function'
        ? api.onMapUpdated((event) => {
            if (get().maps[event.cwd] !== undefined) {
              void get().loadMap(event.cwd);
            }
            // Phase 161. A scoped picture is a reading of the same fact
            // base, so it moves when the base does. Only the scopes the
            // drill can still reach are held, and the in flight fold in
            // each read keeps a burst at two asks.
            reloadScopedReads(get(), event.cwd);
          })
        : () => undefined;
    // Phase 158. The pass says where it stands while it runs, the way a
    // session row says written and the time. Nothing is announced, no toast
    // and no badge, because a pass that finished is a face that changed,
    // not an interruption.
    const pass = passBridge();
    // THE CHOICE IS MADE IN SETTINGS, AND THE PANE MUST LEARN OF IT. The pass
    // status is main's reading of the sealed choice, and it is read once per
    // repository and then held, so a person who picked an agent in Settings
    // with the pane already open used to keep the "pick one in Settings"
    // face and no run control until a relaunch (the Phase 158 verifier's
    // blocking finding). The settings broadcast is the one signal that the
    // choice moved, so every held status is read again on it. A read, never
    // a spawn: main answers from the seal checked value and starts nothing.
    const settingsBridge = gmuxBridge();
    const offSettings =
      pass !== null && typeof settingsBridge?.onSettingsChanged === 'function'
        ? settingsBridge.onSettingsChanged(() => {
            for (const cwd of Object.keys(get().passes)) {
              void get().reloadPass(cwd);
            }
          })
        : () => undefined;
    const offPass =
      pass !== null
        ? pass.onPass((event) => {
            if (event.phase === 'started') {
              patchPass(set, event.cwd, {
                refusal: null,
                status: runningStatus(
                  get().passes[event.cwd]?.status ?? null,
                  event.cwd
                )
              });
              return;
            }
            // Finished: main's status read is the truth the face draws, and
            // a kept run moved `docs/arch/`, so the contract and any held
            // map are read back the way a finished check is.
            void get().reloadPass(event.cwd);
            if (event.run?.verdict === 'kept') {
              if (get().maps[event.cwd] !== undefined) {
                void get().loadMap(event.cwd);
              }
              const target = get().target;
              if (target !== null && localPathOf(target) === event.cwd) {
                void get().refresh();
              }
            }
          })
        : () => undefined;
    return () => {
      offChecked();
      offProgress();
      offMapUpdated();
      offSettings();
      offPass();
    };
  },

  applyProgress(cwd, done, total) {
    const target = get().target;
    if (target === null || localPathOf(target) !== cwd) return;
    set({ checking: done < total, progress: { done, total } });
  },

  verdicts() {
    const { lastCheck, load } = get();
    return lastCheck?.verdicts ?? load?.verdicts ?? NONE;
  },

  components() {
    return get().load?.components ?? NONE;
  },

  edges() {
    return get().load?.edges ?? NONE;
  },

  problems() {
    return get().load?.problems ?? NONE;
  },

  counts() {
    const { lastCheck, load } = get();
    return lastCheck?.counts ?? load?.counts ?? null;
  },

  freshness() {
    const { lastCheck, load } = get();
    return lastCheck?.freshness ?? load?.freshness ?? NONE;
  },

  nameOf(componentId) {
    return (
      get().load?.components.find((c) => c.id === componentId)?.name ??
      componentId
    );
  }
}));

/**
 * Ask again for every scoped reading this window holds of one repository
 * (Phase 161). Runs on the same two pushes the level 1 map re-reads on, so
 * the drilled picture and the whole picture can never sit at two different
 * readings of the facts for longer than a read takes.
 */
function reloadScopedReads(s: ArchViewState, cwd: string): void {
  const prefix = `${cwd}\u0000`;
  for (const key of Object.keys(s.partMaps)) {
    if (key.startsWith(prefix)) {
      void s.loadPartMap(cwd, key.slice(prefix.length));
    }
  }
  for (const key of Object.keys(s.moduleViews)) {
    if (key.startsWith(prefix)) {
      void s.loadModuleView(cwd, key.slice(prefix.length));
    }
  }
}

// `ensureDraftFolders` LIVED HERE UNTIL PHASE 158 and is gone on purpose:
// the seed write happens in main, whose one writer module makes the folders
// itself, so the renderer creates nothing and holds no path at all.
