/**
 * The Search view — the sidebar's third view, beside Explorer and Source
 * Control.
 *
 * It is split into a HEADER and a SECTION for the same reason the SCM and
 * Explorer views are: the sidebar owns the 36 px header band (S1), so exactly
 * one label and one hairline cross it whichever view is showing.
 *
 * WHAT THE SUMMARY ROW SAYS, and why the words are chosen rather than copied:
 *
 *  - While streaming it counts UP, live, with a 2 px indeterminate line under
 *    the query block. Results land in ~3 ms and stream for as long as ripgrep
 *    runs; a spinner that hid the count would be slower-feeling than the
 *    engine actually is.
 *  - The stale chip says "changed since this search", not "3 files changed".
 *    gmux's one repo watcher coalesces a burst into a single repo-level
 *    notification and throws the per-file detail away (src/main/watcher/
 *    bus.ts says so explicitly), so a file COUNT would be invented. Naming
 *    what we know is the honest version of VS Code's chip.
 *  - It never re-runs itself. Agents rewrite this repo continuously; a search
 *    that refreshed on every watcher event would move rows out from under the
 *    cursor. Refresh is a click.
 */

import React, { useEffect, useMemo } from 'react';
import type { GmuxApi } from '@shared/ipc';
import { localPathOf, targetOfProject } from '@shared/workspace-target';
import { Codicon } from '../icons';
import { useApp } from '../state/store';
import { QueryBlock } from './QueryBlock';
import { ResultsList } from './ResultsList';
import { useSearch } from './store';

/** The sidebar's 36 px band slice for this view. */
export function SearchHeader(): React.JSX.Element {
  const status = useSearch((s) => s.status);
  const files = useSearch((s) => s.files);
  const query = useSearch((s) => s.query);
  // PHASE 90.3. Search does not reach another machine, and until this phase its
  // header still offered Refresh and Clear on a tab whose folder is over there.
  // Both are drawn OFF now rather than removed, which is the rule the rest of
  // this app follows: a control that vanished would read as a missing feature.
  // It also stops Search and Context disagreeing, because the Context view has
  // drawn its own controls off in that state since Phase 90.1.
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const onMachine = useMemo(() => {
    const target = targetOfProject(
      projects.find((p) => p.id === activeProjectId) ?? null
    );
    return target !== null && localPathOf(target) === null;
  }, [projects, activeProjectId]);
  const run = useSearch((s) => s.run);
  const cancel = useSearch((s) => s.cancel);
  const clear = useSearch((s) => s.clear);
  const collapseAll = useSearch((s) => s.collapseAll);
  const expandAll = useSearch((s) => s.expandAll);
  const collapsed = useSearch((s) => s.collapsed);

  const searching = status === 'searching';
  const hasResults = files.length > 0;
  const allCollapsed = hasResults && collapsed.size >= files.length;

  return (
    <div className="view-header" data-slot="view-header">
      <span className="view-header-title">Search</span>
      <span className="view-header-spacer" />
      {searching ? (
        <button
          type="button"
          className="icon-btn view-header-action"
          aria-label="Stop this search"
          title="Stop this search"
          onClick={cancel}
        >
          <Codicon name="search-stop" size={16} />
        </button>
      ) : (
        <button
          type="button"
          className="icon-btn view-header-action"
          aria-label="Run this search again"
          title="Run this search again"
          disabled={query.length === 0 || onMachine}
          onClick={() => run()}
        >
          <Codicon name="refresh" size={16} />
        </button>
      )}
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label="Clear the search"
        title="Clear the search"
        disabled={(query.length === 0 && !hasResults) || onMachine}
        onClick={clear}
      >
        <Codicon name="clear-all" size={16} />
      </button>
      <button
        type="button"
        className="icon-btn view-header-action"
        aria-label={allCollapsed ? 'Expand all files' : 'Collapse all files'}
        title={allCollapsed ? 'Expand all files' : 'Collapse all files'}
        disabled={!hasResults}
        onClick={allCollapsed ? expandAll : collapseAll}
      >
        <Codicon name="collapse-all" size={16} />
      </button>
    </div>
  );
}

function Summary(): React.JSX.Element | null {
  const status = useSearch((s) => s.status);
  const totalMatches = useSearch((s) => s.totalMatches);
  const totalFiles = useSearch((s) => s.totalFiles);
  const stale = useSearch((s) => s.stale);
  const capped = useSearch((s) => s.capped);
  const run = useSearch((s) => s.run);

  if (status === 'idle') return null;

  const counted =
    totalMatches === 0
      ? status === 'searching'
        ? 'Searching…'
        : 'No results'
      : `${totalMatches.toLocaleString()} ${
          totalMatches === 1 ? 'result' : 'results'
        } in ${totalFiles.toLocaleString()} ${
          totalFiles === 1 ? 'file' : 'files'
        }${capped ? ' so far' : ''}`;

  return (
    <div className="search-summary" data-slot="search-summary">
      {/* Announce the FINAL count once — a live region that fired on every
          streamed frame would read a counter aloud to a screen reader. */}
      <span aria-live="polite">{status === 'searching' ? '' : counted}</span>
      <span aria-hidden={status !== 'searching'}>
        {status === 'searching' ? counted : ''}
      </span>
      <span className="search-summary-spacer" />
      {stale ? (
        <button
          type="button"
          className="search-stale"
          title="Files in this project changed after this search ran. Results are not refreshed automatically — agents write files constantly, and rows moving under your cursor is worse than a slightly old list."
          onClick={() => run()}
        >
          <Codicon name="warning" size={14} />
          <span>changed since this search</span>
          <span className="search-stale-action">Refresh</span>
        </button>
      ) : null}
    </div>
  );
}

/** The view body below the header band. */
export function SearchSection(): React.JSX.Element {
  const status = useSearch((s) => s.status);
  const syncProject = useSearch((s) => s.syncProject);
  const noteRepoChanged = useSearch((s) => s.noteRepoChanged);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );
  // The pair, never the path (Phase 90.1). Two projects on two machines can
  // hold the same path, and the store has to be able to tell them apart.
  const target = useMemo(() => targetOfProject(project), [project]);

  useEffect(() => {
    syncProject(target);
  }, [target, syncProject]);

  // Staleness rides the SAME repo watcher git already uses — one FSEvents
  // subscription per repo, two consumers (src/main/watcher/bus.ts).
  //
  // Deliberately the RAW bridge and not `state/repo-changed`'s debounced bus:
  // that bus exists to stop four surfaces spending four git calls at four
  // different instants, and this handler spends nothing — it flips a "results
  // may be stale" flag, which should not be held back for 150 ms.
  useEffect(() => {
    const git = (window.gmux as GmuxApi | undefined)?.git;
    if (git === undefined) return;
    return git.onChanged((repoPath) => noteRepoChanged(repoPath));
  }, [noteRepoChanged]);

  return (
    <>
      <div className="search-body" data-slot="search-body">
        <QueryBlock />
        <div
          className={`search-progress${status === 'searching' ? ' on' : ''}`}
          role="presentation"
        />
        <Summary />
      </div>
      <ResultsList />
    </>
  );
}

/**
 * Put the caret in the search box (⌘⇧F, and the activity-bar item).
 *
 * Pressed again while already inside the box it SELECTS what is there rather
 * than toggling the view away — retyping over the old query is the gesture
 * people actually make, and losing the view instead is the kind of surprise
 * that stops you using a shortcut.
 */
export function focusSearchInput(seed?: string): void {
  const attempt = (): boolean => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-slot="search-input"]'
    );
    if (input === null) return false;
    if (seed !== undefined && seed.length > 0 && seed !== input.value) {
      useSearch.getState().setQuery(seed);
    }
    input.focus();
    input.select();
    return true;
  };
  // Try NOW — the view is usually already mounted, and a chord that focuses a
  // frame late is a chord that eats the first character you type. The rAF is
  // the fallback for the case where showSidebarView only just mounted it.
  if (attempt()) return;
  requestAnimationFrame(() => {
    attempt();
  });
}

/** True while the keyboard is inside the Search view (scopes ⌥⌘C/W/R). */
export function focusInsideSearch(): boolean {
  const el = document.activeElement;
  return el instanceof Element && el.closest('[data-view="search"]') !== null;
}

/**
 * A one-line, non-empty selection makes a good seed for ⌘⇧F — and a multi-line
 * one does not, which is why this refuses it rather than pasting a paragraph
 * into the query box.
 */
export function selectionSeed(): string | undefined {
  const text = window.getSelection()?.toString() ?? '';
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return undefined;
  if (trimmed.includes('\n')) return undefined;
  return trimmed;
}
