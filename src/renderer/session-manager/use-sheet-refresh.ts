/**
 * Everything that keeps the open session manager true while it sits on screen
 * (Phase 293).
 *
 * A sheet is the first surface in Tortie that can stay open for minutes over
 * every session a person has, while another window, a machine reconnecting or
 * the sessions themselves change what it shows. The first pass of this phase's
 * spec named the timers that keep it honest and gave them to nobody. They are
 * ALL here, in one engine the sheet mounts once through `useSheetRefresh()`,
 * and every one of them is cleared when the sheet goes away:
 *
 *  - The Messages and Last message cells are asked of main (`overview:activity`)
 *    for every Managed id when the sheet opens, for an id the first time it
 *    appears, for an id whose status changed, for every `running` id every
 *    30 s while the sheet is visible on Managed, and for a Past row when its
 *    Details opens. A turn ending is what moves the numbers, and a claude reply
 *    is REPLACED by each later text of the same turn with no status change at
 *    all, so without the 30 s re-ask a row reads `Working` beside `58m ago`.
 *    Status changes and the 30 s re-ask are JOINED: the first one arms one call
 *    1,500 ms later and every one after it rides in that call. The window is
 *    not pushed back by each new change, so a machine whose sessions flip every
 *    second still gets an answer.
 *  - The removed list has no push event (`sessions:listRemoved`), and a
 *    removal can now happen while this sheet is open, so any change to the
 *    session list refetches it, joined the same way over 250 ms.
 *  - THE PRUNE. The selection is kept a subset of the rows a person can SEE:
 *    on every store change, an id the filters now hide or the list no longer
 *    holds is unchecked in that same change. A batch never trusts this has
 *    run and intersects again itself, but the toolbar's count and the
 *    select-all box read the selection directly, so it must be true here.
 *  - A project filter whose group has gone resets to All, which clears the
 *    selection through the store's own rule.
 *  - An expansion whose row has left the list closes, unless its verb is busy,
 *    in which case its own answer is about to land in it.
 *
 * The engine is `createSheetRefresh`, a plain object over a store and the
 * page's visibility, so its tests drive it with fake timers and a real store
 * and no DOM. The hook is a thin mount of it.
 *
 * The two selectors the sheet reads its rows from live here too, because the
 * engine reads the same picture and a single memo slot means the projection
 * is built once per change for both.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { OverviewSessionActivity } from '@shared/overview';
import type { Session, SessionStatus } from '@shared/types';
import type { AppState } from '../state/app-state';
import { effectiveStatusOf, sortProjects, useApp } from '../state/store';
import {
  buildManageProjection,
  type ManageGroup,
  type ManageProjection
} from './projection';
import {
  pastListIds,
  visibleGroups,
  visibleIds,
  visiblePastList,
  type PastEntry
} from './view';

/** A status change and the 30 s re-ask are joined into one call this long after the first. */
export const STATUS_ASK_MS = 1_500;
/** A change to the session list refetches the removed list this long after it. */
export const PAST_REFETCH_MS = 250;
/** How often a visible sheet on Managed re-asks the `running` rows. */
export const RUNNING_REASK_MS = 30_000;

/**
 * How many times one store change may re-run the engine. Each pass may write
 * once through a store verb that refuses to write what is already true, so the
 * second pass finds nothing to do; the cap is what stops a verb that did not
 * refuse from spinning the renderer.
 */
const MAX_PASSES = 4;

const NO_ACTIVITY: Record<string, OverviewSessionActivity> = {};

// ---------------------------------------------------------------------------
// The selectors
// ---------------------------------------------------------------------------

let projectionMemo: { key: readonly unknown[]; value: ManageProjection } | null =
  null;

/**
 * The whole projection for the open sheet, rebuilt only when one of its inputs
 * is a new value. Stable across calls with the same state, which is what a
 * store selector must be.
 */
export function selectManageProjection(s: AppState): ManageProjection {
  const activity = s.sessionSheet?.activity ?? NO_ACTIVITY;
  const canRestore = s.canRestore();
  const canDiscard = s.canDiscard();
  const key = [
    s.sessions,
    s.pastSessions,
    s.projects,
    s.tabOrder,
    s.machineStates,
    s.handbacks,
    activity,
    s.restoringIds,
    s.shellPathReady,
    canRestore,
    canDiscard
  ] as const;
  const memo = projectionMemo;
  if (memo !== null && key.every((one, i) => one === memo.key[i])) {
    return memo.value;
  }
  const value = buildManageProjection({
    sessions: s.sessions,
    pastSessions: s.pastSessions,
    projects: sortProjects(s.projects, s.tabOrder),
    machineStates: s.machineStates,
    handbacks: s.handbacks,
    activity,
    restoringIds: s.restoringIds,
    shellPathReady: s.shellPathReady,
    canRestore,
    canDiscard
  });
  projectionMemo = { key, value };
  return value;
}

/** What the sheet draws for its current tab: the groups the filters leave. */
export interface SheetView {
  projection: ManageProjection;
  /**
   * The current tab's groups, filtered and sorted. The Past tab under All
   * draws `pastList` instead and reads these for its counts alone.
   */
  groups: ManageGroup[];
  /**
   * The Past tab under the All project filter: ONE list in main's order, each
   * row with its group. Null on Managed, and on Past when the project filter
   * names one project, where the group is drawn under its head.
   */
  pastList: PastEntry[] | null;
  /** The ids drawn, in drawn order, never an empty one. */
  visibleIds: string[];
}

let viewMemo: { key: readonly unknown[]; value: SheetView } | null = null;

/** The current tab's view, or null while the sheet is closed. Stable per state. */
export function selectSheetView(s: AppState): SheetView | null {
  const sheet = s.sessionSheet;
  if (sheet === null) return null;
  const projection = selectManageProjection(s);
  // EVERY filter the view reads is in this key. One left out is a stale view:
  // the prune below reads `visibleIds` off the memo, and a control that moved
  // without moving the key leaves a row checked that nobody can see.
  const key = [
    projection,
    sheet.tab,
    sheet.search,
    sheet.project,
    sheet.tabFilter,
    sheet.stateFilter,
    sheet.lifecycle,
    sheet.sort
  ] as const;
  const memo = viewMemo;
  if (memo !== null && key.every((one, i) => one === memo.key[i])) {
    return memo.value;
  }
  const all = sheet.tab === 'managed' ? projection.managed : projection.past;
  // The state filter and the lifecycle control are Managed controls. The Past
  // tab draws neither, and every past row is `discarded`, which no state
  // option but All keeps and neither lifecycle segment admits.
  const filters = {
    search: sheet.search,
    project: sheet.project,
    tabFilter: sheet.tabFilter,
    stateFilter: sheet.tab === 'managed' ? sheet.stateFilter : ('all' as const),
    lifecycle: sheet.tab === 'managed' ? sheet.lifecycle : ('all' as const)
  };
  const groups = visibleGroups(
    all,
    filters,
    sheet.tab === 'managed' ? sheet.sort : null
  );
  // The Past tab is one list in main's order unless the project filter names
  // one project (the operator's ruling, 2026-09-19).
  const pastList =
    sheet.tab === 'past'
      ? visiblePastList(projection.pastRows, projection.past, filters)
      : null;
  const value: SheetView = {
    projection,
    groups,
    pastList,
    visibleIds: pastList === null ? visibleIds(groups) : pastListIds(pastList)
  };
  viewMemo = { key, value };
  return value;
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

/** What the engine needs of the store: zustand's own two methods. */
export interface SheetRefreshStore {
  getState(): AppState;
  subscribe(listener: (state: AppState, prev: AppState) => void): () => void;
}

export interface SheetRefresh {
  /** Begin watching. The first pass asks for every Managed id. */
  start(): void;
  /** Stop watching and clear every timer. */
  stop(): void;
  /** The refresh button: re-read the three lists, then ask every Managed id. */
  refresh(): Promise<void>;
}

/** Whether the page is on screen. A hidden window asks main for nothing. */
function pageVisible(): boolean {
  return (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  );
}

/** Every Managed id, in drawn order, never an empty one. */
function managedIds(projection: ManageProjection): string[] {
  return visibleIds(projection.managed);
}

export function createSheetRefresh(
  store: SheetRefreshStore,
  visible: () => boolean = pageVisible
): SheetRefresh {
  let started = false;
  let unsubscribe: (() => void) | null = null;
  let reask: ReturnType<typeof setInterval> | null = null;
  let statusTimer: ReturnType<typeof setTimeout> | null = null;
  let pastTimer: ReturnType<typeof setTimeout> | null = null;
  /** Ids asked since the sheet opened, so a first sight is asked once. */
  const asked = new Set<string>();
  /** Ids waiting for the joined call. */
  const pending = new Set<string>();
  let lastStatus = new Map<string, SessionStatus>();
  let lastSessions: readonly Session[] | null = null;
  let syncing = false;
  let again = false;

  const ask = (ids: readonly string[]): void => {
    const fresh = ids.filter((id) => id.length > 0);
    if (fresh.length === 0) return;
    for (const id of fresh) asked.add(id);
    void store.getState().loadSessionActivity(fresh);
  };

  const flushPending = (): void => {
    statusTimer = null;
    if (!started) return;
    const ids = [...pending];
    pending.clear();
    if (store.getState().sessionSheet === null) return;
    ask(ids);
  };

  /** Join ids into the next call. The first one arms it; the rest ride along. */
  const join = (ids: readonly string[]): void => {
    for (const id of ids) if (id.length > 0) pending.add(id);
    if (pending.size > 0 && statusTimer === null) {
      statusTimer = setTimeout(flushPending, STATUS_ASK_MS);
    }
  };

  const armPastRefetch = (): void => {
    if (pastTimer !== null) return;
    pastTimer = setTimeout(() => {
      pastTimer = null;
      if (!started || store.getState().sessionSheet === null) return;
      void store.getState().refreshPastSessions();
    }, PAST_REFETCH_MS);
  };

  const syncOnce = (s: AppState): void => {
    const sheet = s.sessionSheet;
    if (sheet === null) return;
    const projection = selectManageProjection(s);

    // What changed status since the last change, and what was never asked.
    const nextStatus = new Map<string, SessionStatus>();
    const changed: string[] = [];
    for (const session of s.sessions) {
      if (session.id.length === 0) continue;
      const status = effectiveStatusOf(session);
      nextStatus.set(session.id, status);
      const before = lastStatus.get(session.id);
      if (before !== undefined && before !== status) changed.push(session.id);
    }
    lastStatus = nextStatus;
    if (changed.length > 0) join(changed);
    const firstSeen = managedIds(projection).filter(
      (id) => !(id in sheet.activity) && !asked.has(id)
    );
    ask(firstSeen);

    // Details on a Past row asks for that one row.
    const inline = sheet.inline;
    if (
      inline !== null &&
      inline.kind === 'details' &&
      sheet.tab === 'past' &&
      !(inline.id in sheet.activity) &&
      !asked.has(inline.id)
    ) {
      ask([inline.id]);
    }

    // The removed list follows the session list.
    if (lastSessions !== null && s.sessions !== lastSessions) armPastRefetch();
    lastSessions = s.sessions;

    // A project filter whose group is gone. The store's patch clears the
    // selection, and the next pass prunes against the widened filter.
    const tabGroups =
      sheet.tab === 'managed' ? projection.managed : projection.past;
    if (
      sheet.project !== 'all' &&
      !tabGroups.some((group) => group.key === sheet.project)
    ) {
      s.patchSessionSheet({ project: 'all' });
      return;
    }

    // THE PRUNE: `checked` stays a subset of what a person can see. A write
    // ends this pass, and the next one reads the state it made.
    const view = selectSheetView(s);
    if (view !== null) {
      const seen = new Set(view.visibleIds);
      if (Object.keys(sheet.checked).some((id) => !seen.has(id))) {
        s.pruneSessionSheetChecked(view.visibleIds);
        return;
      }
    }

    // An expansion whose row has left this tab's list, and that is not busy.
    if (inline !== null && inline.busy !== true) {
      const list = sheet.tab === 'past' ? s.pastSessions : s.sessions;
      if (!list.some((one) => one.id === inline.id)) {
        s.setSessionSheetInline(null);
      }
    }
  };

  /**
   * Run on every store change. A store verb called from inside a pass fires
   * the listener again before the pass returns; that nested call is turned
   * into one more pass over the fresh state rather than a pass over a state
   * the outer one has already moved past.
   */
  const onChange = (): void => {
    if (!started) return;
    if (syncing) {
      again = true;
      return;
    }
    syncing = true;
    try {
      let passes = 0;
      do {
        again = false;
        passes += 1;
        syncOnce(store.getState());
      } while (again && started && passes < MAX_PASSES);
    } finally {
      syncing = false;
    }
  };

  const tick = (): void => {
    const s = store.getState();
    const sheet = s.sessionSheet;
    if (sheet === null || sheet.tab !== 'managed' || !visible()) return;
    join(
      s.sessions
        .filter((one) => effectiveStatusOf(one) === 'running')
        .map((one) => one.id)
    );
  };

  return {
    start() {
      if (started) return;
      started = true;
      unsubscribe = store.subscribe(onChange);
      reask = setInterval(tick, RUNNING_REASK_MS);
      onChange();
    },
    stop() {
      started = false;
      unsubscribe?.();
      unsubscribe = null;
      if (reask !== null) clearInterval(reask);
      if (statusTimer !== null) clearTimeout(statusTimer);
      if (pastTimer !== null) clearTimeout(pastTimer);
      reask = null;
      statusTimer = null;
      pastTimer = null;
      pending.clear();
    },
    async refresh() {
      await store.getState().refreshSessionSheet();
      if (!started) return;
      const s = store.getState();
      if (s.sessionSheet === null) return;
      ask(managedIds(selectManageProjection(s)));
    }
  };
}

/**
 * Mount the engine for as long as the sheet is drawn. Answers the refresh
 * button's handler, which is the engine's own so the button and the timers
 * ask main the same way.
 */
export function useSheetRefresh(): { refresh(): void } {
  const engine = useRef<SheetRefresh | null>(null);
  useEffect(() => {
    const one = createSheetRefresh(useApp);
    engine.current = one;
    one.start();
    return () => {
      one.stop();
      if (engine.current === one) engine.current = null;
    };
  }, []);
  const refresh = useCallback(() => {
    void engine.current?.refresh();
  }, []);
  return { refresh };
}
