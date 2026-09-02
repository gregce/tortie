/**
 * FILE HISTORY section (Phase 198, research 76 section 7.1): one file's
 * commits, followed back through its renames and copies, under History in
 * the SCM pane.
 *
 * It FOLLOWS THE EDITOR'S ACTIVE TAB rather than the Explorer's selection,
 * because the Explorer exposes selection only imperatively and the two are
 * different sidebar views. A tab that is itself a commit's diff does not move
 * the section: clicking row after row is how a file history is read, and the
 * list must stay put while the diff changes. It is empty and collapsed while
 * no file of this repository is open.
 *
 * Rows are the History section's own row shape with the status letter where
 * the graph gutter would be, and there is no gutter: `--follow` drops merge
 * commits, so a lane fold would have parents pointing at rows that are not in
 * the list. Choosing a row opens that commit's diff of the file through the
 * same request an expanded commit's file row sends, single click a preview,
 * double click or Enter pinned. At a rename the row's directory span shows
 * the old path and its title says the file was renamed from it; below the
 * boundary each row names the path the file had then, which is what
 * `git:commitFileDiff` reads both sides from.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GitGraphLogEntry, GitGraphLogFile } from '@shared/types';
import { useEditor } from '../editor/store';
import { useNow } from '../format';
import { Codicon } from '../icons';
import { useGit } from '../state/git';
import { fileHistoryKey, useGitDepth } from './depth';
import { fileBadge } from './file-badge';
import { formatRelative, renamedFromTitle, splitPath } from './format';
import { requestCommitFileOpen } from './open-commit-file';
import { usePersistedBool } from './sections';

/** The active tab's file, when it is a plain file of this repository. */
function followableRel(repoPath: string): string | null {
  const s = useEditor.getState();
  const tab = s.tabs.find((t) => t.id === s.activeId);
  if (tab === undefined) return null;
  if (tab.repoPath !== repoPath) return null;
  if (tab.commit !== null) return null;
  if (tab.remote !== undefined) return null;
  if (tab.archMap !== undefined || tab.diagnostics !== undefined) return null;
  return tab.relPath;
}

export function FileHistorySection({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element {
  const gitUiBusy = useGit((s) => s.repos[repoPath]?.refreshing ?? false);
  const depth = useGitDepth();
  const reveal = useGitDepth((s) => s.fileHistoryReveal);
  const now = useNow();

  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.fileHistoryCollapsed.${repoPath}`,
    false
  );

  // Which file the section follows. The active tab decides it whenever the
  // active tab is a plain file of this repository; a commit tab, a review of
  // a file on another machine or the map keeps the file already followed,
  // and closing every tab lets it go.
  const activeId = useEditor((s) => s.activeId);
  const tabCount = useEditor((s) => s.tabs.length);
  const [followed, setFollowed] = useState<string | null>(() =>
    followableRel(repoPath)
  );
  useEffect(() => {
    const rel = followableRel(repoPath);
    if (rel !== null) setFollowed(rel);
    else if (tabCount === 0) setFollowed(null);
  }, [activeId, tabCount, repoPath]);

  // View then File History opens the section wherever it sits.
  const lastReveal = useRef(reveal);
  useEffect(() => {
    if (reveal !== lastReveal.current) {
      lastReveal.current = reveal;
      if (collapsed) setCollapsed(false);
    }
  }, [reveal, collapsed, setCollapsed]);

  const key = followed === null ? null : fileHistoryKey(repoPath, followed);
  const win = useGitDepth((s) => (key === null ? undefined : s.files[key]));
  const open = !collapsed && followed !== null;

  useEffect(() => {
    if (open && followed !== null) depth.ensureFile(repoPath, followed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, followed, repoPath]);

  const rows = win?.rows ?? null;
  const [cursor, setCursor] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const primaryAuthor = useMemo(() => {
    if (rows === null || rows.length === 0) return null;
    const counts = new Map<string, number>();
    for (const e of rows) counts.set(e.authorName, (counts.get(e.authorName) ?? 0) + 1);
    let best: string | null = null;
    let bestCount = 0;
    for (const [name, count] of counts) {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    }
    return best;
  }, [rows]);

  const openRow = useCallback(
    (entry: GitGraphLogEntry, preview: boolean): void => {
      const file: GitGraphLogFile = entry.file ?? {
        path: followed ?? '',
        status: 'M'
      };
      requestCommitFileOpen(repoPath, file, entry, preview);
    },
    [repoPath, followed]
  );

  const ids = useMemo(() => {
    const list = (rows ?? []).map((e) => e.hash);
    if (win?.hasMore === true) list.push('more');
    return list;
  }, [rows, win?.hasMore]);

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (ids.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = cursor === null ? -1 : ids.indexOf(cursor);
      const next =
        idx === -1
          ? e.key === 'ArrowDown'
            ? 0
            : ids.length - 1
          : Math.min(Math.max(idx + (e.key === 'ArrowDown' ? 1 : -1), 0), ids.length - 1);
      const id = ids[next];
      if (id === undefined) return;
      setCursor(id);
      listRef.current
        ?.querySelector(`[data-fhist="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const id = cursor ?? ids[0];
      if (id === 'more') {
        if (followed !== null) void depth.loadMoreFile(repoPath, followed);
        return;
      }
      const entry = rows?.find((r) => r.hash === id);
      // Enter is an explicit activation, so the tab is pinned.
      if (entry !== undefined) openRow(entry, false);
    }
  };

  const renderRow = (entry: GitGraphLogEntry): React.JSX.Element => {
    const sha = entry.hash;
    const file = entry.file;
    const status = file?.status ?? 'M';
    const badge = fileBadge(status);
    const showAuthor = primaryAuthor !== null && entry.authorName !== primaryAuthor;
    // The path this row names beside the subject: the old path on the rename
    // row, and the path the file had then on every row below the boundary.
    // Above the boundary the path is the section's own and says nothing new.
    const thenPath =
      file === undefined
        ? null
        : file.origPath !== undefined
          ? file.origPath
          : file.path !== followed
            ? file.path
            : null;
    const title =
      file !== undefined && file.origPath !== undefined
        ? renamedFromTitle(file.path, file.origPath, file.status)
        : (file?.path ?? followed ?? '');
    return (
      <div
        key={sha}
        role="option"
        aria-selected={cursor === sha}
        aria-label={`${entry.subject}, ${badge.word}, ${entry.authorName}, ${formatRelative(entry.authorDate, now)}${thenPath !== null ? `, as ${thenPath}` : ''}`}
        data-fhist={sha}
        data-sha={sha}
        data-status={status}
        className={['scm-hrow', 'scm-fhrow', cursor === sha ? 'selected' : '']
          .filter(Boolean)
          .join(' ')}
        title={title}
        onClick={() => {
          setCursor(sha);
          openRow(entry, true);
        }}
        onDoubleClick={() => openRow(entry, false)}
      >
        <span className={`scm-badge ${badge.cls}`} aria-hidden="true">
          {badge.letter}
        </span>
        <span className="scm-hsubject">{entry.subject}</span>
        {showAuthor ? <span className="scm-hauthor">{entry.authorName}</span> : null}
        {thenPath !== null ? (
          <span className="scm-row-dir scm-fhpath">{thenPath}</span>
        ) : (
          <span className="scm-row-space" />
        )}
        <span className="scm-hage num">{formatRelative(entry.authorDate, now)}</span>
      </div>
    );
  };

  const name = followed === null ? null : splitPath(followed);
  const headerTitle =
    followed === null
      ? 'Open a file to see its history'
      : `History of ${followed}. Merge commits are not listed.`;

  return (
    <section
      className={`section-scm-filehistory${open ? '' : ' collapsed'}`}
      data-section-root="fileHistory"
      {...(followed !== null ? { 'data-file': followed } : {})}
    >
      <div
        className={`section-header${open ? '' : ' collapsed'}`}
        data-section="fileHistory"
      >
        <button
          type="button"
          className="section-toggle"
          aria-expanded={open}
          aria-label={
            followed === null ? 'File history' : `File history of ${followed}`
          }
          title={headerTitle}
          disabled={followed === null}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size="sm" />
          </span>
          {name === null ? 'File history' : name.base}
          <span className="section-count num">
            {rows !== null && rows.length > 0 ? rows.length : ''}
          </span>
        </button>
        {name !== null && name.dir !== '' ? (
          <span className="scm-scope-tag scm-fhdir">{name.dir}</span>
        ) : null}
        <span className="section-spacer" />
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size="md" />
        </span>
      </div>
      {open ? (
        <div
          ref={listRef}
          className="section-body scm-history-body scm-filehistory-body"
          role="listbox"
          aria-label={`History of ${followed ?? ''}`}
          tabIndex={0}
          onKeyDown={onListKeyDown}
        >
          {win?.loading === true && rows === null ? (
            <div className="scm-skeleton" aria-hidden="true">
              <div className="scm-skeleton-row" style={{ width: '72%' }} />
              <div className="scm-skeleton-row" style={{ width: '58%' }} />
            </div>
          ) : win?.error !== null && win?.error !== undefined ? (
            <div className="section-stub">{win.error}</div>
          ) : rows === null || rows.length === 0 ? (
            <div className="section-stub">No commit touches this file yet.</div>
          ) : (
            <>
              {rows.map(renderRow)}
              {win?.hasMore === true ? (
                <button
                  type="button"
                  data-fhist="more"
                  className={`scm-load-more scm-fhmore${cursor === 'more' ? ' selected' : ''}`}
                  disabled={win.loading || gitUiBusy}
                  onClick={() => {
                    setCursor('more');
                    if (followed !== null) void depth.loadMoreFile(repoPath, followed);
                  }}
                >
                  {win.loading ? 'Loading…' : 'Load 50 more'}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
