/**
 * The session manager: one sheet over every session Tortie manages, across
 * every project and machine, whether or not its project has a tab (Phase 293,
 * direction D of the design study, the Tabbed sheet).
 *
 * WHAT THIS FILE OWNS is the frame: the compact title bar with its two tabs,
 * the toolbar that swaps between filters and a selection in one 47px element,
 * the scroller that holds the batch panel and the grid, the states that
 * replace the grid, the footer, and the keyboard. The rows are ./ManagedGrid.tsx
 * and ./PastList.tsx, the panels under them are ./InlinePanel.tsx and
 * ./BatchPanel.tsx, and every verb is ./actions.ts. Nothing here acts on a
 * session: the frame hands ids to verbs, and the verbs re-read.
 *
 * THE KEYBOARD NEVER RESTS OUTSIDE THE SHEET WHILE THE SHEET IS THE TOP
 * LAYER. When the node that held it unmounts, focus falls to `body`, and from
 * there Tab, Enter, Enter reaches a control BEHIND the scrim and then a
 * confirmation whose focus is on its destructive button. Three things close
 * that, and this file holds two of them: every focus return names a chain that
 * ends at the selected tab (`focusChain`), which is always drawn and never
 * disabled; and a layout effect with NO dependency list pulls the keyboard
 * back to that tab after any commit that finds it outside. The third is the
 * Tab rung in the window-capture ladder (`../app/keyboard.ts`).
 *
 * Tab wraps through `trapTabKey`, never `modalKeyDown`: the latter prevents
 * Enter on every input, and this sheet has no single submit.
 *
 * No sheet handler acts on a key that repeats. Chromium fires `click` on every
 * repeat of a held Enter, so a held key on `End 3 sessions` would press it
 * again and again; the root swallows a repeating Enter or Space on a button.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { FilterField } from '../controls/FilterField';
import { displayPath, useNow } from '../format';
import { Codicon } from '../icons';
import { trapTabKey } from '../app/focus-trap';
import type { SessionSheetTab } from '../state/session-manager-slice';
import { useApp } from '../state/store';
import {
  cancelBatch,
  cancelInline,
  dismissBatch,
  startBatch,
  stopBatch
} from './actions';
import { BatchPanel } from './BatchPanel';
import { batchEligibility } from './batch-end';
import {
  ALL_PROJECTS,
  CLEAR_FILTERS,
  CLEAR_SELECTION_LABEL,
  CLOSE_LABEL,
  EMPTY_MANAGED,
  EMPTY_PAST,
  END_SELECTED,
  FILTER_PROJECT_LABEL,
  FILTER_STATE_LABEL,
  FILTER_TAB_LABEL,
  LOADING,
  managedFooter,
  NO_MATCH_BODY,
  NO_MATCH_HEADING,
  PAST_FOOTER_HOVER,
  PAST_FOOTER_RIGHT,
  pastFooter,
  projectOptionLabel,
  READ_FAILURE,
  REFRESH_LABEL,
  SEARCH_PLACEHOLDER,
  selectedCount,
  selectionSummary,
  SHEET_ARIA_LABEL,
  SHEET_TITLE,
  SHEET_TITLE_HOVER,
  STATE_FILTER_OPTIONS,
  TAB_FILTER_OPTIONS,
  TAB_MANAGED,
  TAB_PAST,
  TABLIST_LABEL,
  TRY_AGAIN,
  type SheetState
} from './copy';
import { setSessionSheetEscape } from './escape';
import { ManagedGrid } from './ManagedGrid';
import {
  closeSessionManager,
  focusChain,
  markSheetFocus,
  reclaimSheetKeyboard,
  SELECTED_TAB,
  sheetIsTopLayer,
  type SheetFocusMark
} from './open';
import { PastList } from './PastList';
import type { ManageGroup, ManageRow } from './projection';
import { swallowRepeatClick } from './repeat-click';
import { selectSheetView, useSheetRefresh } from './use-sheet-refresh';
import './session-manager.css';

// SPEC 2.13 names `focusChain` as the sheet's. It is defined in the eager leaf
// ./open.ts, because ./actions.ts needs it and this file imports ./actions.ts,
// and a definition here would close a runtime import cycle.
export { focusChain };


/** How many rows the Past tab's loading state draws. */
const SKELETON_ROWS = 5;

/** What the project filter draws a project as, before its folder is added. */
function projectNameKey(group: ManageGroup): string {
  return JSON.stringify([group.label, group.machineLabel]);
}


/**
 * Escape, one layer at a time, as the ladder in `../app/keyboard.ts` asks it.
 * True when a layer inside the sheet took the press; false closes the sheet.
 * Each step re-reads the store, because the closure outlives every render.
 */
function takeEscape(search: HTMLInputElement | null): boolean {
  const s = useApp.getState();
  const sheet = s.sessionSheet;
  if (sheet === null) return false;
  // A focused search field with something in it clears. The ladder stops the
  // key before FilterField's own Escape can see it.
  if (search !== null && document.activeElement === search && sheet.search !== '') {
    s.patchSessionSheet({ search: '' });
    return true;
  }
  // A busy verb's answer is about to land in its panel. The key does nothing.
  if (sheet.inline?.busy === true) return true;
  const batch = sheet.batch;
  if (batch !== null) {
    if (batch.phase === 'running') stopBatch();
    else if (batch.phase === 'confirm') cancelBatch();
    else dismissBatch();
    return true;
  }
  if (sheet.inline !== null) {
    cancelInline();
    return true;
  }
  return false;
}

/** A state that replaces the grid: a mark, a heading, a body, perhaps a button. */
function StateBlock({
  state,
  children
}: {
  state: SheetState;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="sm-state-block">
      {/* 24, the app's ceiling and one of the four sizes `<Codicon>`'s own doc
          sanctions off the 12/14/16 scale. 28 was larger than anything the app
          draws (Phase 298, mechanism 9). */}
      <Codicon name={state.icon} size={24} />
      {/* Classed, because this phase rewrites their type and a bare element
          selector carrying type is what `.set-row-label` and `.srow-name`
          already avoid (Phase 298, mechanism 17). */}
      <h2 className="sm-state-heading">{state.heading}</h2>
      <p className="sm-state-body">{state.body}</p>
      {children}
    </div>
  );
}

function Tab({
  tab,
  selected,
  running,
  label,
  icon,
  count
}: {
  tab: SessionSheetTab;
  selected: boolean;
  running: boolean;
  label: string;
  icon: string;
  count: number;
}): React.JSX.Element {
  // NEVER `disabled`. The selected tab is the last stop of every focus chain,
  // and a disabled button cannot take the keyboard. While a batch runs the
  // store refuses the change and the tab says so to assistive tech.
  return (
    <button
      type="button"
      role="tab"
      id={`sm-tab-${tab}`}
      className="sm-tab"
      aria-controls="sm-panel"
      aria-selected={selected}
      tabIndex={0}
      {...(running ? { 'aria-disabled': 'true' as const } : {})}
      onClick={() => useApp.getState().setSessionSheetTab(tab)}
    >
      {/* `sm`, the size the row's own Restore draws `history` at
          (./ManagedGrid.tsx's `PrimaryButton`): one glyph, one size. The two
          MARKS themselves stay `terminal` and `history` — docs/DESIGN-SPEC.md
          S15 names them, so a later round changes the size and never the glyph
          (Phase 298, mechanism 9). */}
      <Codicon name={icon} size="sm" />
      {label}
      {/* `chip-sm`: the app's 16px chip box (globals.css:345-349), the same one
          the machine badge beside it is (Phase 298, mechanism 6). */}
      <span className="chip-sm sm-count">{count}</span>
    </button>
  );
}

export function SessionManagerSheet(): React.JSX.Element | null {
  // The same bit the lazy door reads, first, as every lazy surface does.
  const open = useApp((s) => s.sessionSheet !== null);
  const sheet = useApp((s) => s.sessionSheet);
  const view = useApp(selectSheetView);
  const pastLoading = useApp((s) => s.pastLoading);
  const pastHeld = useApp((s) => s.pastSessions.length);
  const machineStates = useApp((s) => s.machineStates);
  const now = useNow(10_000);
  const { refresh } = useSheetRefresh();

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollByTab = useRef<Record<SessionSheetTab, number>>({
    managed: 0,
    past: 0
  });
  const opened = useRef(false);
  const lastFocus = useRef<SheetFocusMark | null>(null);
  /**
   * A focus return that must wait for the commit its own write causes: the
   * control it names is not drawn until then (the search field comes back
   * only when the toolbar leaves selection mode).
   */
  const pendingFocus = useRef<readonly string[] | null>(null);
  const tab = sheet?.tab ?? 'managed';

  // The ladder asks this closure; it is dropped the moment the sheet unmounts,
  // so the ladder never asks a sheet that is not drawn.
  useEffect(() => {
    setSessionSheetEscape(() => takeEscape(searchRef.current));
    return () => setSessionSheetEscape(null);
  }, []);

  // Where the keyboard is, as it moves, and the keyboard back the moment
  // anything takes it OUT of the sheet while the sheet is the top layer. A
  // commit is not enough on its own: a terminal behind the scrim takes the
  // keyboard when its session attaches, hundreds of milliseconds after the
  // commit that selected it, and characters typed then reached that session
  // (the fix round; the press attack measured a hotkey's session holding it
  // for up to 168 ms and the split arrows for a second). A toast's button
  // still takes its click: the click lands on what is under the pointer.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent): void => {
      const root = sheetRef.current;
      const target = e.target;
      if (root === null || !(target instanceof HTMLElement)) return;
      if (root.contains(target)) {
        lastFocus.current = markSheetFocus(target);
        return;
      }
      if (!sheetIsTopLayer()) return;
      reclaimSheetKeyboard(lastFocus.current);
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, []);

  // Open: the keyboard goes to the search field. After that, EVERY commit
  // that finds the keyboard outside the sheet while the sheet is the top
  // layer gives it back, where it was when that is still there, else to the
  // selected tab. No dependency list, on purpose.
  useLayoutEffect(() => {
    if (!opened.current) {
      opened.current = true;
      focusChain(['#sm-search', SELECTED_TAB]);
      return;
    }
    const chain = pendingFocus.current;
    if (chain !== null) {
      pendingFocus.current = null;
      focusChain(chain);
      return;
    }
    if (!sheetIsTopLayer()) return;
    const active = document.activeElement;
    const root = sheetRef.current;
    if (
      active === null ||
      active === document.body ||
      root === null ||
      !root.contains(active)
    ) {
      reclaimSheetKeyboard(lastFocus.current);
    }
  });

  // One scroll place per tab. The scroller is one node for the life of the
  // sheet, so a tab change keeps the node and moves its place.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node !== null) node.scrollTop = scrollByTab.current[tab];
  }, [tab]);

  const machineKnown = useMemo(() => {
    const ids = new Set(machineStates.map((one) => one.id));
    return (id: string) => ids.has(id);
  }, [machineStates]);

  if (!open || sheet === null || view === null) return null;

  const { projection, groups, pastList, visibleIds } = view;
  const managed = tab === 'managed';
  const batch = sheet.batch;
  const running = batch?.phase === 'running';
  const inlineBusy = sheet.inline?.busy === true;
  const checkedIds = managed
    ? visibleIds.filter((id) => sheet.checked[id] === true)
    : [];
  const selecting = managed && checkedIds.length > 0;
  // The rows a person can SEE on Managed, by id. The batch panel reads its
  // named targets through this and nothing wider: a named session the filters
  // now hide is not one a person can see, and a batch never ends one of those.
  const visibleRows = new Map<string, ManageRow>();
  if (managed) {
    for (const group of groups) {
      for (const row of group.rows) {
        if (row.id.length > 0) visibleRows.set(row.id, row);
      }
    }
  }

  // The selection's running count is the batch's own eligibility over the
  // same gates, asked NOW. It is a count for the resting face; the batch
  // computes its own at the press and trusts nothing drawn here. While a
  // confirmation stands the two can differ in ONE direction only: a row that
  // became eligible after the confirmation opened (a machine that came back)
  // raises this count and is never named, because the named list is frozen as
  // an upper bound (SPEC 2.10). The confirmation's own heading and skipped
  // line are the ones that say what a press will do.
  let eligible = 0;
  for (const id of checkedIds) {
    const row = visibleRows.get(id);
    if (row === undefined) continue;
    if (batchEligibility(row.session, row.gates, machineKnown) === 'yes') {
      eligible += 1;
    }
  }

  const tabGroups = managed ? projection.managed : projection.past;
  // Two projects can be named alike in different trees, and the filter then
  // offered two identical rows naming neither (the reverify of the Past
  // ruling, R3). Only the ones that collide carry their folder as well.
  const sameNamed = new Set<string>();
  const seenNames = new Set<string>();
  for (const group of tabGroups) {
    const key = projectNameKey(group);
    if (seenNames.has(key)) sameNamed.add(key);
    else seenNames.add(key);
  }
  const total = managed ? projection.managedTotal : projection.pastTotal;
  const shownRows = groups.reduce((n, group) => n + group.rows.length, 0);

  const clearFilters = (): void => {
    pendingFocus.current = ['#sm-search', SELECTED_TAB];
    const s = useApp.getState();
    s.patchSessionSheet({
      search: '',
      project: 'all',
      tabFilter: 'all',
      stateFilter: 'all'
    });
    s.clearSessionSheetChecked();
  };

  let body: React.ReactNode;
  if (sheet.listError !== null) {
    body = (
      <StateBlock state={READ_FAILURE}>
        <button type="button" className="btn btn-primary" onClick={refresh}>
          {TRY_AGAIN}
        </button>
      </StateBlock>
    );
  } else if (!managed && pastLoading && pastHeld === 0) {
    body = (
      <div className="sm-loading" role="status">
        <span className="sm-loading-label">{LOADING}</span>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className="sm-skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  } else if (total === 0) {
    body = <StateBlock state={managed ? EMPTY_MANAGED : EMPTY_PAST} />;
  } else if (groups.length === 0) {
    body = (
      <StateBlock
        state={{
          icon: managed ? 'search' : 'history',
          heading: NO_MATCH_HEADING,
          body: NO_MATCH_BODY
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          data-sm="clear-filters"
          onClick={clearFilters}
        >
          {CLEAR_FILTERS}
        </button>
      </StateBlock>
    );
  } else if (managed) {
    body = (
      <ManagedGrid
        groups={groups}
        visibleIds={visibleIds}
        sheet={sheet}
        now={now}
      />
    );
  } else {
    body = (
      <PastList groups={groups} list={pastList} sheet={sheet} now={now} />
    );
  }

  return (
    <div
      className="modal-scrim session-sheet-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSessionManager();
      }}
    >
      <div
        ref={sheetRef}
        className="modal session-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={SHEET_ARIA_LABEL}
        tabIndex={-1}
        // The second click of a double click, on a button, a checkbox or its
        // label, does nothing (./repeat-click.ts says why: the first click can
        // close a panel and slide another row's Restore under the pointer).
        onClickCapture={swallowRepeatClick}
        onKeyDownCapture={(e) => {
          // A held Enter or Space on a button would press it on every repeat.
          if (
            e.repeat &&
            (e.key === 'Enter' || e.key === ' ') &&
            (e.target as { tagName?: string }).tagName === 'BUTTON'
          ) {
            e.preventDefault();
          }
        }}
        onKeyDown={(e) => trapTabKey(e, e.currentTarget)}
      >
        <header className="sm-title">
          <h1 className="sm-heading" title={SHEET_TITLE_HOVER}>
            {SHEET_TITLE}
          </h1>
          <div
            className="sm-tabs"
            role="tablist"
            aria-label={TABLIST_LABEL}
            onKeyDown={(e) => {
              if (e.repeat) return;
              let next: SessionSheetTab | null = null;
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                next = tab === 'managed' ? 'past' : 'managed';
              } else if (e.key === 'Home') {
                next = 'managed';
              } else if (e.key === 'End') {
                next = 'past';
              }
              if (next === null) return;
              e.preventDefault();
              if (useApp.getState().setSessionSheetTab(next)) {
                focusChain([`#sm-tab-${next}`]);
              }
            }}
          >
            <Tab
              tab="managed"
              selected={managed}
              running={running}
              label={TAB_MANAGED}
              icon="terminal"
              count={projection.managedTotal}
            />
            <Tab
              tab="past"
              selected={!managed}
              running={running}
              label={TAB_PAST}
              icon="history"
              count={projection.pastTotal}
            />
          </div>
          <div className="sm-title-actions">
            {/* `icon-btn` first, the sheet's modifier second, as
                `.sm-panel-icon` already does it (InlinePanel.tsx:446). The
                shared class is the vocabulary — display, radius, eased
                background — and `.session-sheet .sm-icon-btn` keeps these at
                28px (Phase 298, mechanism 8). */}
            <button
              type="button"
              className="icon-btn sm-icon-btn"
              aria-label={REFRESH_LABEL}
              title={REFRESH_LABEL}
              onClick={refresh}
            >
              <Codicon name="refresh" size="md" />
            </button>
            <button
              type="button"
              className="icon-btn sm-icon-btn"
              aria-label={CLOSE_LABEL}
              title={CLOSE_LABEL}
              onClick={() => closeSessionManager()}
            >
              <Codicon name="close" size="md" />
            </button>
          </div>
        </header>

        <div
          className="sm-panel"
          id="sm-panel"
          role="tabpanel"
          aria-labelledby={`sm-tab-${tab}`}
        >
          <div
            className="sm-toolbar"
            data-sm="toolbar"
            data-mode={selecting ? 'selection' : 'filters'}
          >
            {selecting ? (
              <>
                <button
                  type="button"
                  className="icon-btn sm-icon-btn"
                  aria-label={CLEAR_SELECTION_LABEL}
                  title={CLEAR_SELECTION_LABEL}
                  disabled={running}
                  onClick={() => {
                    pendingFocus.current = ['#sm-search', SELECTED_TAB];
                    useApp.getState().clearSessionSheetChecked();
                  }}
                >
                  <Codicon name="close" size="md" />
                </button>
                <strong className="sm-selected">
                  {selectedCount(checkedIds.length)}
                </strong>
                <span className="sm-selection-summary">
                  {selectionSummary(eligible, checkedIds.length - eligible)}
                </span>
                <span className="sm-spacer" />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm sm-end"
                  data-sm="end-selected"
                  disabled={eligible === 0 || batch !== null || inlineBusy}
                  onClick={() => startBatch()}
                >
                  {/* `close`, the glyph the row's own End button draws
                      (./ManagedGrid.tsx's `PrimaryButton`) and the only one of
                      the two in `MENU_CODICONS`, so the sheet says "end a
                      session" with one mark wherever it says it (Phase 298,
                      mechanism 9). */}
                  <Codicon name="close" size="sm" />
                  {END_SELECTED}
                </button>
              </>
            ) : (
              <>
                <FilterField
                  value={sheet.search}
                  onChange={(next) =>
                    useApp.getState().patchSessionSheet({ search: next })
                  }
                  placeholder={SEARCH_PLACEHOLDER}
                  className="sm-search"
                  inputRef={(node) => {
                    searchRef.current = node;
                    // FilterField takes no id; the probe, the focus chains
                    // and the Escape rung all name this one.
                    if (node !== null) node.id = 'sm-search';
                  }}
                />
                <select
                  id="sm-filter-project"
                  className="sm-select sm-select-project"
                  aria-label={FILTER_PROJECT_LABEL}
                  value={sheet.project}
                  onChange={(e) =>
                    useApp.getState().patchSessionSheet({ project: e.target.value })
                  }
                >
                  <option value="all">{ALL_PROJECTS}</option>
                  {tabGroups.map((group) => (
                    <option key={group.key} value={group.key}>
                      {projectOptionLabel(
                        group.label,
                        group.machineLabel,
                        group.tabOpen,
                        // Two folders can be named alike, and two identical
                        // options name neither (the reverify, R3). The folder
                        // is added only to the ones that collide.
                        sameNamed.has(projectNameKey(group))
                          ? displayPath(group.path, group.machineId ?? undefined)
                          : null
                      )}
                    </option>
                  ))}
                </select>
                <select
                  id="sm-filter-tab"
                  className="sm-select sm-select-tab"
                  aria-label={FILTER_TAB_LABEL}
                  value={sheet.tabFilter}
                  onChange={(e) =>
                    useApp.getState().patchSessionSheet({
                      tabFilter: e.target.value as typeof sheet.tabFilter
                    })
                  }
                >
                  {TAB_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {managed ? (
                  <select
                    id="sm-filter-state"
                    className="sm-select sm-select-state"
                    aria-label={FILTER_STATE_LABEL}
                    value={sheet.stateFilter}
                    onChange={(e) =>
                      useApp.getState().patchSessionSheet({
                        stateFilter: e.target.value as typeof sheet.stateFilter
                      })
                    }
                  >
                    {STATE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </>
            )}
          </div>

          <div
            ref={scrollRef}
            className="sm-scroll"
            onScroll={(e) => {
              scrollByTab.current[tab] = e.currentTarget.scrollTop;
            }}
          >
            {managed && batch !== null ? (
              <BatchPanel batch={batch} rowsById={visibleRows} />
            ) : null}
            {body}
          </div>

          {/*
           * WHERE A TOAST GOES WHILE THIS SHEET IS OPEN (Phase 298, rough edge
           * 1). `.toasts` is fixed at the window's bottom right over
           * `--z-modal`, so with two toasts up the last row's End button was
           * under one and the click landed on the toast — the comment on the
           * focus effect above already admitted it. Docked here it is a
           * `flex: 0 0 auto` strip that takes its height from the scroller and
           * covers nothing.
           *
           * A DOM CONTRACT, NOT A REF, and not conditional. A shared ref would
           * need a module both ../app/Toasts.tsx and this domain import, and an
           * eager import from `app` into this domain pulls the lazily loaded
           * sheet (./lazy.tsx) into the first bundle. The toast host finds this
           * node by `[data-sm="toast-outlet"]` and portals into it; drawn
           * always, so the host never races the sheet's own mount, and empty it
           * takes no height at all, which is why the row counts hold with
           * nothing toasted. With no outlet present the host draws exactly
           * where it draws today.
           */}
          <div className="sm-toasts" data-sm="toast-outlet" />

          <footer className="sm-foot" data-sm="foot">
            <span>
              {managed
                ? managedFooter(shownRows)
                : pastFooter(shownRows, sheet.project === 'all' ? groups.length : null)}
            </span>
            {managed ? null : (
              <span title={PAST_FOOTER_HOVER}>{PAST_FOOTER_RIGHT}</span>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
