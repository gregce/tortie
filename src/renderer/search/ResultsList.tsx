/**
 * The virtualized result tree.
 *
 * VIRTUALIZATION IS MANDATORY, not an optimisation: 10,000 match rows are
 * routine on a real query, and 10,000 DOM rows is a frozen sidebar. Every row
 * is exactly ROW_HEIGHT tall, so the window is arithmetic — no measurement
 * pass, no ResizeObserver, no layout thrash while results stream in.
 *
 * KEYBOARD MODEL, and the one rule that matters most: **arrowing does not
 * open.** With 10,000 results, the difference between "arrow through 40 rows"
 * and "load 40 files" is the difference between a usable list and a stuttering
 * one. ↩ opens into the preview tab and FOCUS STAYS HERE, so ↓ ↩ ↓ ↩ walks the
 * result set with one tab recycling behind it. ⌘↩ and double-click pin.
 *
 * PHASE 98 GAVE THIS LIST A SECOND KIND OF ROW, and it is the same row. A
 * result from another machine carries the shape a result from this Mac carries,
 * so nothing here branches on where it came from except three things. The
 * folder a row names is that machine's folder rather than a folder here. An
 * open carries the machine, which is what makes the editor read the file over
 * there. And a match row draws no surrounding lines toggle, because the reader
 * that fetches those lines reads this Mac.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  localPathOf,
  sameTarget,
  targetOfProject
} from '@shared/workspace-target';
import { FileIcon, Codicon } from '../icons';
import {
  SEARCH_FILTERS_ON_THIS_MAC,
  SEARCH_NO_BRIDGE
} from '../app/machine-copy';
import { useApp } from '../state/store';
import {
  machineEmptyLine,
  openSearchLine,
  openSearchResult,
  remoteRefOf,
  remoteSearchAvailable,
  searchAvailable,
  useSearch
} from './store';
import { resultMenu } from './result-menu';
import {
  ROW_HEIGHT,
  flattenRows,
  rowKey,
  splitHighlights,
  splitPath
} from './rows';
import type { SearchRow } from './rows';

/** Rows rendered above and below the viewport, so a fast flick never tears. */
const OVERSCAN = 8;

export function ResultsList(): React.JSX.Element {
  const target = useSearch((s) => s.target);
  const machineLabel = useSearch((s) => s.machineLabel);
  // PHASE 98. The folder, on whichever computer it is on. Until this phase this
  // was `localPathOf`, which is null for a folder on another machine, so every
  // open, every Copy Path and every Copy Relative Path returned early. The
  // machine reference beside it is what tells the editor which computer to read
  // the file from, and it is null for this Mac.
  const repoPath = target?.path ?? null;
  const onMachine = target !== null && localPathOf(target) === null;
  const remote = useMemo(
    () => remoteRefOf({ target, machineLabel }),
    [target, machineLabel]
  );
  const files = useSearch((s) => s.files);
  const collapsed = useSearch((s) => s.collapsed);
  const expanded = useSearch((s) => s.expanded);
  const context = useSearch((s) => s.context);
  const selectedKey = useSearch((s) => s.selectedKey);
  const status = useSearch((s) => s.status);
  const capped = useSearch((s) => s.capped);
  const setSelectedKey = useSearch((s) => s.setSelectedKey);
  const toggleGroup = useSearch((s) => s.toggleGroup);
  const toggleContext = useSearch((s) => s.toggleContext);
  const showMore = useSearch((s) => s.showMore);
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);

  const rows = useMemo(
    () => flattenRows({ files, collapsed, expanded, context }),
    [files, collapsed, expanded, context]
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el === null) return;
    const measure = (): void => setViewport(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visible = Math.ceil(viewport / ROW_HEIGHT) + OVERSCAN * 2;
  const slice = rows.slice(first, first + visible);

  /** Scroll a row index into view — the other half of keyboard navigation. */
  const revealRow = useCallback((index: number): void => {
    const el = scrollerRef.current;
    if (el === null) return;
    const top = index * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = top + ROW_HEIGHT - el.clientHeight;
    }
  }, []);

  const selectedIndex = useMemo(
    () => rows.findIndex((row) => rowKey(row) === selectedKey),
    [rows, selectedKey]
  );

  const open = useCallback(
    (row: SearchRow, preview: boolean): void => {
      if (repoPath === null) return;
      if (row.kind === 'match') {
        openSearchResult(repoPath, row.relPath, row.match, preview, remote);
      } else if (row.kind === 'context') {
        openSearchLine(repoPath, row.relPath, row.context.line, preview, remote);
      } else if (row.kind === 'file') {
        const line = row.file.matches[0]?.line ?? 1;
        openSearchLine(repoPath, row.relPath, line, preview, remote);
      }
    },
    [repoPath, remote]
  );

  const move = useCallback(
    (delta: number): void => {
      if (rows.length === 0) return;
      const from = selectedIndex === -1 ? (delta > 0 ? -1 : rows.length) : selectedIndex;
      const next = Math.max(0, Math.min(rows.length - 1, from + delta));
      const row = rows[next];
      if (row === undefined) return;
      setSelectedKey(rowKey(row));
      revealRow(next);
    },
    [rows, selectedIndex, setSelectedKey, revealRow]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    // Read the selection from the STORE, not from the render closure. A click
    // (or a probe) that selects a row and presses ↩ in the same tick would
    // otherwise act on the selection as it was one render ago — which is to
    // say, on nothing.
    const liveKey = useSearch.getState().selectedKey;
    const at =
      liveKey === selectedKey
        ? selectedIndex
        : rows.findIndex((row) => rowKey(row) === liveKey);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(-rows.length);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(rows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // ↩ with nothing selected opens the FIRST result rather than doing
      // nothing: focus is in the list, the list has an obvious first answer,
      // and "the key did nothing" is never the right response to that.
      const row = rows[at] ?? rows.find((r) => r.kind === 'match') ?? rows[0];
      if (row !== undefined) {
        setSelectedKey(rowKey(row));
        open(row, !e.metaKey);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const row = rows[at];
      if (row?.kind === 'file') {
        const isCollapsed = collapsed.has(row.relPath);
        if ((e.key === 'ArrowRight') === isCollapsed) {
          e.preventDefault();
          toggleGroup(row.relPath);
        }
      }
    }
  };

  if (rows.length === 0) return <EmptyResults />;

  return (
    <div
      ref={scrollerRef}
      className="search-results"
      data-slot="search-results"
      role="tree"
      aria-label="Search results"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: rows.length * ROW_HEIGHT, position: 'relative' }}>
        {slice.map((row) => {
          const key = rowKey(row);
          const selected = key === selectedKey;
          return (
            <div
              key={key}
              className={`search-row-wrap${selected ? ' selected' : ''}`}
              style={{ top: row.index * ROW_HEIGHT }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (repoPath === null) return;
                setSelectedKey(key);
                setMenu(
                  resultMenu({
                    row,
                    repoPath,
                    x: e.clientX,
                    y: e.clientY,
                    open,
                    toggleGroup,
                    toast
                  })
                );
              }}
            >
              {row.kind === 'file' ? (
                <FileRow
                  row={row}
                  collapsed={collapsed.has(row.relPath)}
                  onToggle={() => toggleGroup(row.relPath)}
                  onSelect={() => setSelectedKey(key)}
                />
              ) : row.kind === 'match' ? (
                <MatchRow
                  row={row}
                  onMachine={onMachine}
                  onSelect={() => setSelectedKey(key)}
                  onOpen={(preview) => open(row, preview)}
                  onToggleContext={() =>
                    toggleContext(row.relPath, row.match.line)
                  }
                />
              ) : row.kind === 'context' ? (
                <ContextRow row={row} onOpen={() => open(row, true)} />
              ) : (
                <div className="search-clipped">
                  {row.hidden.toLocaleString()} more{' '}
                  {row.hidden === 1 ? 'match' : 'matches'} in this file are not
                  shown
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PHASE 98. "Show more" raises the cap and runs the search again, which
          on another machine means asking that machine to scan the whole tree a
          second time. The machine note under the summary states the cut
          instead, in one sentence, and the count above it already reads "so
          far". */}
      {capped && status !== 'searching' && !onMachine ? (
        <div className="search-capped">
          <span>
            Showing the first {useSearch.getState().resultLimit.toLocaleString()}{' '}
            results.
          </span>
          <button type="button" className="btn-text search-inline-action" onClick={showMore}>
            Show more
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FileRow({
  row,
  collapsed,
  onToggle,
  onSelect
}: {
  row: Extract<SearchRow, { kind: 'file' }>;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: () => void;
}): React.JSX.Element {
  const { name, dir } = splitPath(row.relPath);
  return (
    <button
      type="button"
      className="search-file"
      role="treeitem"
      aria-expanded={!collapsed}
      title={row.relPath}
      onClick={() => {
        onSelect();
        onToggle();
      }}
    >
      <Codicon name={collapsed ? 'chevron-right' : 'chevron-down'} size={16} />
      <FileIcon path={row.relPath} size={16} />
      <span className="search-file-name">{name}</span>
      {dir.length > 0 ? <span className="search-file-dir">{dir}</span> : null}
      <span className="search-file-spacer" />
      {row.file.binary === true ? (
        <span className="search-file-note" title="Binary file — ripgrep stopped early">
          binary
        </span>
      ) : null}
      <span className="search-file-count num">
        {row.file.matchCount.toLocaleString()}
      </span>
    </button>
  );
}

function MatchRow({
  row,
  onMachine,
  onSelect,
  onOpen,
  onToggleContext
}: {
  row: Extract<SearchRow, { kind: 'match' }>;
  /** PHASE 98. The row came from a machine, so it has no context toggle. */
  onMachine: boolean;
  onSelect: () => void;
  onOpen: (preview: boolean) => void;
  onToggleContext: () => void;
}): React.JSX.Element {
  const pieces = splitHighlights(row.match.text, row.match.ranges);
  return (
    <div className="search-match" role="treeitem" aria-selected={false}>
      {/* PHASE 98. The surrounding lines come from `search:context`, which
          reads a file on this Mac, and there is no such file for a row a
          machine sent. The gutter takes the toggle's place there, so the row
          stays aligned with every other row in the list and no control is
          drawn that could not do its job. */}
      {onMachine ? (
        <span className="search-context-gutter" />
      ) : (
        <button
          type="button"
          className={`search-context-toggle${row.expanded ? ' on' : ''}`}
          aria-label={
            row.expanded ? 'Hide surrounding lines' : 'Show surrounding lines'
          }
          aria-expanded={row.expanded}
          title={row.expanded ? 'Hide surrounding lines' : 'Show surrounding lines'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            onToggleContext();
          }}
        >
          {/* The same chevron the file groups use. `fold`/`unfold` were tried
              first and read as ✕ at 12 px — a delete affordance on every
              match row is not a mistake worth risking. */}
          <Codicon
            name={
              row.loading
                ? 'loading'
                : row.expanded
                  ? 'chevron-down'
                  : 'chevron-right'
            }
            size={12}
          />
        </button>
      )}
      <button
        type="button"
        className="search-match-body"
        onClick={(e) => {
          onSelect();
          onOpen(!e.metaKey);
        }}
        onDoubleClick={() => onOpen(false)}
      >
        <span className="search-line num">{row.match.line}</span>
        <span className="search-text">
          {pieces.map((piece, i) =>
            piece.hit ? (
              <mark key={i} className="search-hit">
                {piece.text}
              </mark>
            ) : (
              <span key={i}>{piece.text}</span>
            )
          )}
          {row.match.truncated === true ? (
            <span className="search-truncated" title="This line was too long to show in full">
              {' '}
              …
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

function ContextRow({
  row,
  onOpen
}: {
  row: Extract<SearchRow, { kind: 'context' }>;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="search-match search-context"
      onClick={onOpen}
    >
      <span className="search-context-gutter" />
      <span className="search-line num">{row.context.line}</span>
      <span className="search-text">{row.context.text}</span>
    </button>
  );
}

/**
 * The states between "nothing typed" and "here are your results".
 *
 * The no-results case names ACTIVE FILTERS and offers to clear them, because
 * "search is broken" is almost always "an include glob from twenty minutes ago
 * is still in force" — VS Code's single most common support question.
 */
function EmptyResults(): React.JSX.Element {
  const status = useSearch((s) => s.status);
  const query = useSearch((s) => s.query);
  const error = useSearch((s) => s.error);
  const includes = useSearch((s) => s.includes);
  const excludes = useSearch((s) => s.excludes);
  const useIgnoreFiles = useSearch((s) => s.useIgnoreFiles);
  const isRegex = useSearch((s) => s.isRegex);
  const setIncludes = useSearch((s) => s.setIncludes);
  const setExcludes = useSearch((s) => s.setExcludes);
  const target = useSearch((s) => s.target);
  const remoteMode = useSearch((s) => s.remoteMode);
  const machineLabel = useSearch((s) => s.machineLabel);
  const projects = useApp((s) => s.projects);
  // The project is found by IDENTITY, not by path (Phase 90.1). A path alone
  // matched the first project with that path, which on two machines is the
  // wrong one half the time.
  const projectName =
    projects.find((p) => sameTarget(targetOfProject(p), target))?.name ??
    'this project';

  // PHASE 98. Said FIRST, because every sentence after it is about a search on
  // this Mac. The folder is on another machine, and what a person reads depends
  // on the one word that machine answered with.
  if (target !== null && localPathOf(target) === null) {
    // An older preload cannot ask a machine anything at all. Said before a
    // person types, not after, which is the rule the local case follows too.
    if (!remoteSearchAvailable()) {
      return (
        <div className="search-empty">
          <p className="search-empty-title">{SEARCH_NO_BRIDGE}</p>
        </div>
      );
    }
    // The four words that mean no rows at all. Each one is a whole sentence
    // from machine-copy.ts, and the note under the summary stays silent for
    // all four so the same thing is never said twice.
    const refusal = machineEmptyLine(
      remoteMode,
      machineLabel ?? target.machineId
    );
    if (refusal !== null) {
      return (
        <div className="search-empty">
          <p className="search-empty-title">{refusal}</p>
        </div>
      );
    }
    if (status === 'error' && error !== null) {
      return (
        <div className="search-empty" role="alert">
          <p className="search-empty-title">Search could not run.</p>
          <p className="search-empty-body">{error}</p>
        </div>
      );
    }
    if (status === 'searching') {
      return (
        <div className="search-empty">
          <p className="search-empty-body">Searching…</p>
        </div>
      );
    }
    if (query.length === 0 || status === 'idle') {
      // The body names the three filters rather than the stream, because a
      // search on another machine arrives in one answer and does not stream,
      // and because those three are the ones that do not go there.
      return (
        <div className="search-empty">
          <p className="search-empty-title">Search across {projectName}</p>
          <p className="search-empty-body">{SEARCH_FILTERS_ON_THIS_MAC}</p>
        </div>
      );
    }
    // A read that found nothing. The note above says how the folder was read.
    return (
      <div className="search-empty">
        <p className="search-empty-title">No results found.</p>
      </div>
    );
  }

  if (status === 'error' && error !== null && !isRegex) {
    return (
      <div className="search-empty" role="alert">
        <p className="search-empty-title">Search could not run.</p>
        <p className="search-empty-body">{error}</p>
      </div>
    );
  }

  if (!searchAvailable()) {
    // Said BEFORE anything is typed, not after. An older preload has no
    // search bridge at all, and inviting someone to type a query that can
    // never run is worse than saying so up front.
    return (
      <div className="search-empty">
        <p className="search-empty-title">Search is not available in this build.</p>
        <p className="search-empty-body">
          The Explorer and Source Control views are unaffected.
        </p>
      </div>
    );
  }

  if (query.length === 0 || status === 'idle') {
    return (
      <div className="search-empty">
        <p className="search-empty-title">Search across {projectName}</p>
        <p className="search-empty-body">
          Matches stream in as they are found. Case, whole word and regular
          expressions are the three toggles beside the box.
        </p>
      </div>
    );
  }

  if (status === 'searching') {
    return (
      <div className="search-empty">
        <p className="search-empty-body">Searching…</p>
      </div>
    );
  }

  const filters: string[] = [];
  if (includes.trim().length > 0) filters.push('an include filter');
  if (excludes.trim().length > 0) filters.push('an exclude filter');
  if (useIgnoreFiles) filters.push('ignored files are being skipped');

  return (
    <div className="search-empty">
      <p className="search-empty-title">No results found.</p>
      {filters.length > 0 ? (
        <p className="search-empty-body">
          {sentenceCase(joinWithAnd(filters))} — that may be why.{' '}
          {includes.trim().length > 0 || excludes.trim().length > 0 ? (
            <button
              type="button"
              className="btn-text search-inline-action"
              onClick={() => {
                setIncludes('');
                setExcludes('');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
