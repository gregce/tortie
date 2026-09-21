/**
 * The session manager's state (Phase 293).
 *
 * The session manager is one sheet that lists every session Tortie manages,
 * across every project and machine, on a Managed tab and a Past tab. One field
 * holds the open sheet, or null while it is closed, and every verb over it is
 * here.
 *
 * WHY THE RULES LIVE IN THE STORE AND NOT IN THE COMPONENTS. The sheet ends
 * processes, one at a time and many at a time, and it is the first surface in
 * Tortie where a confirmation can stand on screen for minutes while another
 * window, a machine reconnecting or the session itself changes what is under
 * it. Every defect the design review found in its first pass was a rule that a
 * component kept and a second route walked past: the menu door switched the tab
 * under an armed confirmation, a continuation wrote a failure under a row it
 * was never about, a second press started a second run. So each rule below is a
 * refusal written into the verb itself, the verb ANSWERS whether it acted, and
 * no component, door or continuation has a way round it.
 *
 * THE RULES, each held by a test in __tests__/p293-session-manager-slice.test.ts:
 *
 *  1. `sessionSheet` is `null` at rest and NEVER `undefined`. Four readers ask
 *     `!== null` (the modal layer, the saved output modal, the lazy door, the
 *     Escape rung), and `undefined !== null` would read as an open sheet.
 *  2. ANY write that changes `checked`, by any route, closes a confirmation
 *     that has not been pressed and an expansion that is not busy. An armed
 *     confirmation never stands over a selection it was not opened on.
 *  3. While a batch RUNS nothing moves under it: the tab, the selection and the
 *     expansions are all refused. The prune is the one exception, because it
 *     only ever removes an id a person can no longer see.
 *  4. One expansion at a time, never beside a batch, and never over a busy one.
 *  5. A continuation writes ONLY into its own busy panel. `patchSessionSheet`'s
 *     type cannot carry a panel at all.
 *  6. A batch's targets are frozen in ONE write that also refuses a second
 *     press, and they are a subset of what was NAMED when the confirmation
 *     opened and of what is CHECKED at the press. The list shrinks and never
 *     grows.
 *  7. A report from a run that is not the current one is dropped, and the run
 *     id comes from a counter that never resets, so a loop left over from a
 *     sheet that was closed and reopened can never write into the new batch.
 *
 * This module lives under src/renderer/state and therefore names nothing in
 * src/renderer/app, src/renderer/editor or the session-manager domain. It
 * DECLARES `BatchSkipReason` and `BatchRowOutcome` for that reason: the slice
 * stores them, and the domain's batch-end.ts re-exports them.
 *
 * Nothing here sets a session's status, and nothing here is persisted: no
 * `gmux.*` localStorage key is read or written.
 */

import type { StateCreator } from 'zustand';
import type { CaptureChoice } from '@shared/ipc';
import type {
  OverviewActivity,
  OverviewActivityInput,
  OverviewSessionActivity
} from '@shared/overview';
import { gmuxBridge } from '../bridge';
import { errorText } from './errors';
import type { AppState } from './app-state';

// ---------------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------------

export type SessionSheetTab = 'managed' | 'past';

/** What an expansion under a row is showing. */
export type SessionSheetInlineKind =
  | 'details'
  | 'rename'
  | 'output'
  | 'end'
  | 'remove'
  | 'restore-open'
  | 'restore-bare'
  | 'restart-bare'
  | 'failed';

/** Which verb a `failed` panel's Retry re-enters, at its gate. */
export type SessionSheetRetry =
  | 'end'
  | 'remove'
  | 'restore'
  | 'restore-bare'
  | 'restart'
  | 'restart-bare';

/**
 * The one open expansion. It is keyed by SESSION ID and never by a row object,
 * an index or a name, so a refresh or a push re-renders the row under it
 * without moving it.
 *
 * `busy` is written by `markSessionSheetInlineBusy` and by nothing else. A
 * caller that sets it through any other verb has it dropped, because the flag
 * is what makes a second press, a double click and a repeating Enter do
 * nothing, and a panel that could be born busy could never be answered.
 */
export interface SessionSheetInline {
  id: string;
  kind: SessionSheetInlineKind;
  retry?: SessionSheetRetry;
  message?: string;
  busy?: boolean;
  options?: CaptureChoice;
}

/** Why a checked row is not ended by a batch. */
export type BatchSkipReason = 'ended' | 'unreachable' | 'gone';

/** What happened to one target of a batch End. */
export type BatchRowOutcome =
  | { state: 'pending' }
  | { state: 'ending' }
  | { state: 'ended' }
  | { state: 'skipped'; reason: BatchSkipReason }
  | { state: 'failed'; message: string }
  | { state: 'not-run' };

/** One session a confirmation names. `where` is its group, as it was drawn. */
export interface SessionSheetBatchTarget {
  id: string;
  where: string;
}

/**
 * One batch End, from the confirmation to the report.
 *
 * THERE IS NO COPY OF THE SELECTION ON IT. The freeze reads `checked` from the
 * sheet at the press, so a row a person unchecked after the confirmation
 * opened cannot be ended by a list that remembered it.
 */
export interface SessionSheetBatch {
  /** 0 until the press. */
  runId: number;
  phase: 'confirm' | 'running' | 'done';
  /** Frozen when the confirmation opened. An upper bound that never grows. */
  named: SessionSheetBatchTarget[];
  skippedAtOpen: { ended: number; unreachable: number };
  /** Session ids, frozen at the press. Empty until then. */
  targets: string[];
  outcomes: Record<string, BatchRowOutcome>;
  stopRequested: boolean;
}

export interface SessionSheetState {
  tab: SessionSheetTab;
  search: string;
  /** `'all'`, or a GROUP KEY. Never a project id and never a name. */
  project: string;
  tabFilter: 'all' | 'open' | 'closed';
  stateFilter:
    | 'all'
    | 'running'
    | 'working'
    | 'needs-input'
    | 'idle'
    | 'ended'
    | 'unreachable';
  /**
   * Phase 303. The lifecycle question, asked BEFORE the state detail: is the
   * session alive or over? Active is what a row's gates call `live` or
   * `unknown`, Ended is what they call `ended`, and the State select above
   * refines within it. A Managed control, like `stateFilter`.
   */
  lifecycle: 'all' | 'active' | 'ended';
  sort: {
    key: 'name' | 'state' | 'created' | 'messages' | 'last-message';
    dir: 1 | -1;
  } | null;
  /** The selection, by session id. */
  checked: Record<string, true>;
  inline: SessionSheetInline | null;
  batch: SessionSheetBatch | null;
  /** One sentence when the lists could not be read, else null. */
  listError: string | null;
  /** What main answered about each session's conversation, by session id. */
  activity: Record<string, OverviewSessionActivity>;
}

/**
 * What `patchSessionSheet` may change. IT CANNOT CARRY `inline`, `batch` OR
 * `checked`, so no continuation can write a panel, a run or a selection
 * through the verb that has no refusals of its own.
 */
export type SessionSheetFilterPatch = Partial<
  Pick<
    SessionSheetState,
    | 'search'
    | 'project'
    | 'tabFilter'
    | 'stateFilter'
    | 'lifecycle'
    | 'sort'
    | 'listError'
  >
>;

export interface SessionManagerSlice {
  /** The open sheet, or `null`. Never `undefined`. */
  sessionSheet: SessionSheetState | null;

  /**
   * Open the sheet on a fresh state, or switch the tab of an open one through
   * `setSessionSheetTab`. Answers whether the sheet is now on that tab. A fresh
   * open fetches the removed list, because nothing pushes it.
   */
  openSessionSheet(tab: SessionSheetTab): boolean;
  /**
   * Close the sheet. It is never refused: a running batch reads the closed
   * sheet as a request to stop after the call in flight, and a continuation
   * finds no panel to write into and says its failure in a toast instead.
   */
  closeSessionSheet(): void;
  /**
   * Change filters, the sort or the read-failure line. A CHANGE to `search`,
   * `project`, `tabFilter`, `stateFilter` or `lifecycle` clears the selection.
   */
  patchSessionSheet(patch: SessionSheetFilterPatch): void;
  /**
   * REFUSED (false) while a batch runs. Otherwise it resets the state filter
   * and the lifecycle control, clears the selection, closes an expansion that
   * is not busy and any batch that is not running.
   */
  setSessionSheetTab(tab: SessionSheetTab): boolean;
  /** Check or uncheck rows BY ID. Refused while a batch runs, and off Managed. */
  setSessionSheetChecked(ids: readonly string[], on: boolean): boolean;
  /** Uncheck everything. Refused while a batch runs. */
  clearSessionSheetChecked(): boolean;
  /**
   * Uncheck every id that is not in `keep`. NEVER refused: it only removes an
   * id the filters now hide or the list no longer holds. It writes nothing
   * when nothing changes, so it is safe to call on every commit.
   */
  pruneSessionSheetChecked(keep: readonly string[]): boolean;
  /**
   * Open, replace or close (null) the one expansion. REFUSED while the current
   * one is busy, and an open is refused while a batch is running or done.
   * Opening one CLOSES a confirmation that has not been pressed.
   */
  setSessionSheetInline(next: SessionSheetInline | null): boolean;
  /** True only when `inline.id === id` and it was not busy. A second press is false. */
  markSessionSheetInlineBusy(id: string): boolean;
  /**
   * A continuation's one door. It writes only when `inline.id === id` AND that
   * panel is busy, always a whole panel or null, and answers whether it wrote.
   * False means the sheet closed or the panel is no longer this id's, and the
   * caller then says its failure in a toast.
   */
  settleSessionSheetInline(id: string, next: SessionSheetInline | null): boolean;
  /** Open the confirmation. Refused while a batch exists, an expansion is busy, or off Managed. */
  openSessionSheetBatch(input: {
    named: readonly SessionSheetBatchTarget[];
    skippedAtOpen: { ended: number; unreachable: number };
  }): boolean;
  /**
   * THE FREEZE, in one write. Null unless the batch is in `confirm`. Otherwise
   * the phase becomes `running`, the targets are stored, and the run id is
   * minted. A null answer is a second press or a closed panel.
   */
  beginSessionSheetBatchRun(targets: readonly string[]): number | null;
  /** Dropped unless `runId` is the current batch's and `id` is one of its targets. */
  reportSessionSheetBatch(
    runId: number,
    id: string,
    outcome: BatchRowOutcome
  ): void;
  /**
   * Dropped unless current. Every target ended: the batch closes and the
   * selection clears. Otherwise `done`, and only the targets that did NOT end
   * and were not skipped stay checked.
   */
  finishSessionSheetBatch(runId: number): void;
  /** Ask a running batch to stop after the call in flight. */
  requestSessionSheetBatchStop(): void;
  /** Close a confirmation or a report, keeping the selection. Refused while running. */
  closeSessionSheetBatch(): boolean;
  /** Re-read the session list, the removed list and the project list. */
  refreshSessionSheet(): Promise<void>;
  /**
   * Ask main about these sessions' conversations, a hundred at a time, one
   * chunk after another, and merge the answers by id. EVERY id asked for is
   * settled, whatever happens, so no cell stays pending.
   */
  loadSessionActivity(ids: readonly string[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * The run id counter. Module scope and NEVER reset, so an id is never reused
 * across a close and a reopen. A loop asks whether `batch.runId` is still its
 * own, and a counter that restarted with the sheet would hand the second batch
 * the first one's id and its stop flag with it.
 */
let batchRunSeq = 0;

/** How many ids one `overview:activity` call carries. Main's cap is 200. */
const ACTIVITY_CHUNK = 100;

function freshSheet(tab: SessionSheetTab): SessionSheetState {
  return {
    tab,
    search: '',
    project: 'all',
    tabFilter: 'all',
    stateFilter: 'all',
    lifecycle: 'all',
    sort: null,
    checked: {},
    inline: null,
    batch: null,
    listError: null,
    activity: {}
  };
}

/** The ids worth acting on: strings, non-empty, once each, in the order given. */
function cleanIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    // NOTHING WITHOUT A SESSION ID IS EVER A TARGET. An empty id cannot occur
    // by type, and the store is the last place that can refuse one.
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sameChecked(
  a: Record<string, true>,
  b: Record<string, true>
): boolean {
  const left = Object.keys(a);
  if (left.length !== Object.keys(b).length) return false;
  return left.every((id) => b[id] === true);
}

/** A panel as the store holds it at rest: never busy. */
function atRest(next: SessionSheetInline): SessionSheetInline {
  const { busy: _busy, ...rest } = next;
  return rest;
}

/**
 * RULE 2. The one way `checked` is written. When the selection really changes,
 * a confirmation that has not been pressed closes and so does an expansion
 * that is not busy. A running batch and a busy expansion are left alone: the
 * first is answered by its own report and the second by its own continuation.
 */
function withChecked(
  sheet: SessionSheetState,
  checked: Record<string, true>
): SessionSheetState {
  if (sameChecked(sheet.checked, checked)) return sheet;
  return {
    ...sheet,
    checked,
    batch: sheet.batch?.phase === 'confirm' ? null : sheet.batch,
    inline: sheet.inline?.busy === true ? sheet.inline : null
  };
}

/** What a row reads as when main could not be asked about it. */
function unreadable(sessionId: string): OverviewSessionActivity {
  return {
    sessionId,
    coverage: 'unavailable',
    reason: 'unreadable',
    userMessages: null,
    agentMessages: null,
    lastMessageAt: null,
    lastMessageBy: null,
    lastMessageClock: null,
    readAt: null
  };
}

type ActivityCall = (input: OverviewActivityInput) => Promise<OverviewActivity>;

/**
 * The `overview:activity` bridge method, feature detected at call time. A
 * preload without it is a build without the reader, and the honest answer
 * there is a dash in every cell rather than a throw or a cell that never
 * settles.
 */
function activityCall(): ActivityCall | null {
  const extras = gmuxBridge()?.overview as { activity?: unknown } | undefined;
  const fn = extras?.activity;
  return typeof fn === 'function' ? (fn as ActivityCall) : null;
}

// ---------------------------------------------------------------------------
// The slice
// ---------------------------------------------------------------------------

export const createSessionManagerSlice: StateCreator<
  AppState,
  [],
  [],
  SessionManagerSlice
> = (set, get) => {
  /**
   * The one write. Every verb below computes the next sheet and hands it here.
   *
   * It also owns ONE consequence no component can be trusted with. The saved
   * output expansion reads the sessions slice's saved-output trio, and the
   * saved output MODAL draws that same trio the moment the sheet is closed. An
   * `output` expansion that the store closes by itself (a checkbox, a tab
   * change, a batch opening, the sheet closing) would otherwise leave the trio
   * set, and the modal would appear over the app for a session a person had
   * stopped looking at. So whenever an `output` panel leaves, by any route, the
   * trio is dropped in the same write.
   *
   * Only while the trio is still THAT panel's. The host opens the next row's
   * saved output and then its panel, and the replacement of X's panel by Y's
   * must not drop the read it has just started for Y.
   */
  const commit = (
    prev: SessionSheetState,
    next: SessionSheetState | null
  ): void => {
    if (next === prev) return;
    const was = prev.inline;
    const leftOutput =
      was !== null &&
      was.kind === 'output' &&
      get().savedOutputSessionId === was.id &&
      (next === null ||
        next.inline === null ||
        next.inline.id !== was.id ||
        next.inline.kind !== 'output');
    set(
      leftOutput
        ? {
            sessionSheet: next,
            savedOutputSessionId: null,
            savedOutput: null,
            savedOutputLoading: false
          }
        : { sessionSheet: next }
    );
  };

  /** Say one read failed, in the sheet's own state, first failure first. */
  const failRead = (err: unknown): void => {
    const sheet = get().sessionSheet;
    if (sheet === null || sheet.listError !== null) return;
    commit(sheet, { ...sheet, listError: errorText(err) });
  };

  return {
    // RULE 1. `null`, written out, and never left to a default.
    sessionSheet: null,

    openSessionSheet(tab) {
      if (get().sessionSheet !== null) return get().setSessionSheetTab(tab);
      set({ sessionSheet: freshSheet(tab) });
      // The removed list has no push, so an open is a fetch. The old Past
      // Sessions panel did the same from its own open flag.
      void get().refreshPastSessions();
      return true;
    },

    closeSessionSheet() {
      const sheet = get().sessionSheet;
      if (sheet === null) return;
      commit(sheet, null);
    },

    patchSessionSheet(patch) {
      const sheet = get().sessionSheet;
      if (sheet === null) return;
      // The seven fields are copied by NAME. The type already refuses `inline`,
      // `batch` and `checked`; this is the same refusal for a caller that got
      // past the type with a cast.
      let next: SessionSheetState = sheet;
      let filtersMoved = false;
      if (patch.search !== undefined && patch.search !== sheet.search) {
        next = { ...next, search: patch.search };
        filtersMoved = true;
      }
      if (patch.project !== undefined && patch.project !== sheet.project) {
        next = { ...next, project: patch.project };
        filtersMoved = true;
      }
      if (patch.tabFilter !== undefined && patch.tabFilter !== sheet.tabFilter) {
        next = { ...next, tabFilter: patch.tabFilter };
        filtersMoved = true;
      }
      if (
        patch.stateFilter !== undefined &&
        patch.stateFilter !== sheet.stateFilter
      ) {
        next = { ...next, stateFilter: patch.stateFilter };
        filtersMoved = true;
      }
      if (patch.lifecycle !== undefined && patch.lifecycle !== sheet.lifecycle) {
        next = { ...next, lifecycle: patch.lifecycle };
        filtersMoved = true;
      }
      if (patch.sort !== undefined) {
        const same =
          patch.sort === sheet.sort ||
          (patch.sort !== null &&
            sheet.sort !== null &&
            patch.sort.key === sheet.sort.key &&
            patch.sort.dir === sheet.sort.dir);
        if (!same) next = { ...next, sort: patch.sort };
      }
      if (patch.listError !== undefined && patch.listError !== sheet.listError) {
        next = { ...next, listError: patch.listError };
      }
      // A filter that moved clears the selection, because the rows a person
      // checked are not the rows they are looking at any more. RULE 3: not
      // while a batch runs. Its targets are already frozen, and the prune
      // still unchecks whatever the new filters hide.
      if (filtersMoved && next.batch?.phase !== 'running') {
        next = withChecked(next, {});
      }
      commit(sheet, next);
    },

    setSessionSheetTab(tab) {
      const sheet = get().sessionSheet;
      if (sheet === null) return false;
      // RULE 3. The Session menu's two doors reach this verb, and a tab that
      // moved would unmount the panel of a running batch.
      if (sheet.batch?.phase === 'running') return false;
      if (sheet.tab === tab) return true;
      commit(sheet, {
        ...sheet,
        tab,
        // Both are Managed's alone. Every Past row is `discarded`, which no
        // state option but All keeps and neither lifecycle segment admits, so
        // a value left set would draw an empty Past list.
        stateFilter: 'all',
        lifecycle: 'all',
        checked: {},
        // A busy panel is about to be answered by its own continuation.
        inline: sheet.inline?.busy === true ? sheet.inline : null,
        // An armed confirmation never stands on a tab a person has left. A
        // finished report is closed the way `Done` closes it, because it is
        // drawn on Managed alone and a report left standing would refuse every
        // expansion on the tab the person moved to (`setSessionSheetInline`
        // refuses while one stands). Nothing is running here.
        batch: null
      });
      return true;
    },

    setSessionSheetChecked(ids, on) {
      const sheet = get().sessionSheet;
      if (sheet === null) return false;
      if (sheet.batch?.phase === 'running') return false;
      // The Past tab draws no checkbox, and nothing on it is ever ended.
      if (sheet.tab !== 'managed') return false;
      const checked = { ...sheet.checked };
      for (const id of cleanIds(ids)) {
        if (on) checked[id] = true;
        else delete checked[id];
      }
      const next = withChecked(sheet, checked);
      commit(sheet, next);
      return next !== sheet;
    },

    clearSessionSheetChecked() {
      const sheet = get().sessionSheet;
      if (sheet === null) return false;
      if (sheet.batch?.phase === 'running') return false;
      const next = withChecked(sheet, {});
      commit(sheet, next);
      return next !== sheet;
    },

    pruneSessionSheetChecked(keep) {
      const sheet = get().sessionSheet;
      if (sheet === null) return false;
      const kept = new Set(keep);
      const checked: Record<string, true> = {};
      for (const id of Object.keys(sheet.checked)) {
        if (kept.has(id)) checked[id] = true;
      }
      const next = withChecked(sheet, checked);
      commit(sheet, next);
      return next !== sheet;
    },

    setSessionSheetInline(next) {
      const sheet = get().sessionSheet;
      if (sheet === null) return false;
      // RULE 4. A busy panel's answer is about to land in it. Replacing it
      // would put that answer under another row, and closing it would say the
      // verb was cancelled when it was not.
      if (sheet.inline?.busy === true) return false;
      if (next === null) {
        if (sheet.inline !== null) commit(sheet, { ...sheet, inline: null });
        return true;
      }
      if (next.id.length === 0) return false;
      const phase = sheet.batch?.phase;
      if (phase === 'running' || phase === 'done') return false;
      commit(sheet, {
        ...sheet,
        inline: atRest(next),
        // The person moved on. An armed confirmation never stands beside
        // another panel.
        batch: null
      });
      return true;
    },

    markSessionSheetInlineBusy(id) {
      const sheet = get().sessionSheet;
      const inline = sheet?.inline ?? null;
      if (sheet === null || inline === null) return false;
      if (inline.id !== id || inline.busy === true) return false;
      commit(sheet, { ...sheet, inline: { ...inline, busy: true } });
      return true;
    },

    settleSessionSheetInline(id, next) {
      const sheet = get().sessionSheet;
      const inline = sheet?.inline ?? null;
      // RULE 5. Not this id's panel, not busy, or no sheet at all: nothing is
      // written and the caller is told, so it can say its failure elsewhere.
      if (sheet === null || inline === null) return false;
      if (inline.id !== id || inline.busy !== true) return false;
      if (next !== null && next.id !== id) {
        // A continuation that tried to settle into ANOTHER row's panel. The
        // busy panel is closed rather than left busy for ever, nothing is drawn
        // under the other row, and false sends the sentence to a toast.
        commit(sheet, { ...sheet, inline: null });
        return false;
      }
      commit(sheet, { ...sheet, inline: next === null ? null : atRest(next) });
      return true;
    },

    openSessionSheetBatch({ named, skippedAtOpen }) {
      const sheet = get().sessionSheet;
      if (sheet === null) return false;
      if (sheet.batch !== null) return false;
      if (sheet.inline?.busy === true) return false;
      if (sheet.tab !== 'managed') return false;
      const seen = new Set<string>();
      const kept: SessionSheetBatchTarget[] = [];
      for (const target of named) {
        if (target.id.length === 0 || seen.has(target.id)) continue;
        seen.add(target.id);
        kept.push({ id: target.id, where: target.where });
      }
      commit(sheet, {
        ...sheet,
        inline: null,
        batch: {
          runId: 0,
          phase: 'confirm',
          named: kept,
          skippedAtOpen: {
            ended: skippedAtOpen.ended,
            unreachable: skippedAtOpen.unreachable
          },
          targets: [],
          outcomes: {},
          stopRequested: false
        }
      });
      return true;
    },

    beginSessionSheetBatchRun(targets) {
      let minted: number | null = null;
      // ONE `set`. The check and the flip cannot be separated by anything, so
      // a second press, a held Enter and a double click all find `running`.
      set((s) => {
        const sheet = s.sessionSheet;
        const batch = sheet?.batch ?? null;
        if (sheet === null || batch === null || batch.phase !== 'confirm') {
          return {};
        }
        // RULE 6. A target is an id that was NAMED when the confirmation
        // opened and is CHECKED right now. The caller has already intersected
        // with what is visible and what is still eligible; these two are the
        // ones the store itself can see, so it holds them too. An id that was
        // not named is never a target, however eligible it has become.
        const named = new Set(batch.named.map((t) => t.id));
        const frozen = cleanIds(targets).filter(
          (id) => named.has(id) && sheet.checked[id] === true
        );
        if (frozen.length === 0) return {};
        minted = ++batchRunSeq;
        const outcomes: Record<string, BatchRowOutcome> = {};
        for (const id of frozen) outcomes[id] = { state: 'pending' };
        return {
          sessionSheet: {
            ...sheet,
            batch: {
              ...batch,
              runId: minted,
              phase: 'running',
              targets: frozen,
              outcomes,
              stopRequested: false
            }
          }
        };
      });
      return minted;
    },

    reportSessionSheetBatch(runId, id, outcome) {
      const sheet = get().sessionSheet;
      const batch = sheet?.batch ?? null;
      if (sheet === null || batch === null) return;
      // RULE 7. A loop left over from an earlier run reports into nothing.
      if (batch.phase !== 'running' || batch.runId !== runId) return;
      if (!batch.targets.includes(id)) return;
      commit(sheet, {
        ...sheet,
        batch: { ...batch, outcomes: { ...batch.outcomes, [id]: outcome } }
      });
    },

    finishSessionSheetBatch(runId) {
      const sheet = get().sessionSheet;
      const batch = sheet?.batch ?? null;
      if (sheet === null || batch === null) return;
      if (batch.phase !== 'running' || batch.runId !== runId) return;
      const allEnded = batch.targets.every(
        (id) => batch.outcomes[id]?.state === 'ended'
      );
      if (allEnded) {
        commit(sheet, { ...sheet, batch: null, checked: {} });
        return;
      }
      // Only what did NOT end, and was not skipped, stays checked, so a second
      // press names exactly the sessions that are still there to end.
      const checked: Record<string, true> = {};
      for (const id of batch.targets) {
        const state = batch.outcomes[id]?.state;
        if (state === 'ended' || state === 'skipped') continue;
        if (sheet.checked[id] === true) checked[id] = true;
      }
      commit(sheet, {
        ...sheet,
        checked,
        batch: { ...batch, phase: 'done' }
      });
    },

    requestSessionSheetBatchStop() {
      const sheet = get().sessionSheet;
      const batch = sheet?.batch ?? null;
      if (sheet === null || batch === null) return;
      if (batch.phase !== 'running' || batch.stopRequested) return;
      commit(sheet, { ...sheet, batch: { ...batch, stopRequested: true } });
    },

    closeSessionSheetBatch() {
      const sheet = get().sessionSheet;
      if (sheet === null || sheet.batch === null) return false;
      // A run is stopped, never dismissed: its loop still holds a call in
      // flight, and a closed panel could not say what that call did.
      if (sheet.batch.phase === 'running') return false;
      // The selection is KEPT. Cancel is not Clear selection.
      commit(sheet, { ...sheet, batch: null });
      return true;
    },

    async refreshSessionSheet() {
      const api = gmuxBridge();
      const open = get().sessionSheet;
      if (api === undefined || open === null) return;
      // The line is cleared as the reads start, and each read that fails writes
      // it again. A person who pressed Try again sees the list come back, or
      // sees the failure return, and either way sees that something was tried.
      if (open.listError !== null) commit(open, { ...open, listError: null });
      await Promise.all([
        (async () => {
          try {
            get().applySessions(await api.sessions.list());
          } catch (err) {
            failRead(err);
          }
        })(),
        // It says its own failure, in this same line, while the sheet is open.
        get().refreshPastSessions(),
        (async () => {
          try {
            set({ projects: await api.projects.list() });
          } catch (err) {
            failRead(err);
          }
        })()
      ]);
    },

    async loadSessionActivity(ids) {
      const asked = cleanIds(ids);
      for (let at = 0; at < asked.length; at += ACTIVITY_CHUNK) {
        // Nobody is looking. Main reads agent logs to answer this, and a read
        // for a sheet that has closed is work with no reader.
        if (get().sessionSheet === null) return;
        const chunk = asked.slice(at, at + ACTIVITY_CHUNK);
        const call = activityCall();
        const answered = new Map<string, OverviewSessionActivity>();
        if (call !== null) {
          try {
            const answer = await call({ sessionIds: chunk });
            const rows = Array.isArray(answer?.sessions) ? answer.sessions : [];
            for (const row of rows) {
              if (row !== null && typeof row === 'object' && typeof row.sessionId === 'string') {
                answered.set(row.sessionId, row);
              }
            }
          } catch {
            // A rejection, or main refusing the input. EVERY id of this chunk
            // settles below, so no cell is left reading `…` for ever.
          }
        }
        const sheet = get().sessionSheet;
        if (sheet === null) return;
        const activity = { ...sheet.activity };
        // Merged by the ids that were ASKED, so an answer can neither leave one
        // of them pending nor write a row nobody asked about.
        for (const id of chunk) activity[id] = answered.get(id) ?? unreadable(id);
        commit(sheet, { ...sheet, activity });
      }
    }
  };
};
