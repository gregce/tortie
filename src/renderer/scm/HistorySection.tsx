/**
 * HISTORY section (DESIGN-SPEC S3A, round 1) — the VS Code-bar commit list:
 *
 *   - single topo-ordered lane: rail + dot (HEAD accent, merges hollow)
 *   - subject · author (only when ≠ the repo's usual author) · refs badges
 *   - click expands the commit's files inline; files open in the diff editor
 *   - full per-commit native context menu (Open Changes … Copy Commit Message)
 *   - rich hover card after 600ms (HoverCard.tsx)
 *   - "Load 50 more" paging row
 *
 * Refs badges are derived from `git:branches` tips (local branch pills; a
 * cloud pill when the branch's upstream is exactly in sync). Tag refs have
 * no listing channel yet, so tags created here appear in git but not as
 * badges — noted for the next git-depth pass.
 *
 * "Open Changes" / file clicks emit the canonical open-file bus with
 * `source: 'history'` AND the commit block (sha / shortSha / status /
 * origPath) — Phase 12 item 4. Carrying the SHA is what makes the editor
 * render `<sha>^ → <sha>` (DESIGN-SPEC S3A) instead of HEAD-vs-worktree;
 * before it, every historical file showed the wrong diff and deleted files
 * refused to open at all. Deleted files now open (all red, right side
 * empty), renames read `origPath → path`, and "Open Changes" emits ONE
 * request per changed file so a multi-file commit opens as a set.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type {
  GitBranchInfo,
  GitCommitFileChange,
  GitLogEntry
} from '@shared/types';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { useGit } from '../state/git';
import { useNow } from '../app/format';
import { Codicon } from '../icons';
import {
  depthRepoState,
  detailKey,
  hasGitDepth,
  useGitDepth
} from './depth';
import { formatRelative, fullMessage, shortSha, splitPath } from './format';
import { requestOpenFile } from './open-file';
import { usePersistedBool } from './sections';
import { HoverCard } from './HoverCard';
import { MiniModal } from './MiniModal';
import type { MiniModalSpec } from './MiniModal';

/** DESIGN.md §3 commit row: hover card after 600ms. */
const HOVER_DELAY_MS = 600;
/** Leave grace before the card closes (pointer may travel into it). */
const HOVER_CLOSE_GRACE_MS = 100;
/** Refs pills shown on a row before the +n overflow pill. */
const MAX_REF_PILLS = 2;

// ---------------------------------------------------------------------------
// Refs badges (derived from branch tips)
// ---------------------------------------------------------------------------

interface RefBadge {
  kind: 'branch' | 'remote';
  name: string;
  /** The HEAD branch pill gets the accent treatment. */
  head: boolean;
}

function badgesFor(branches: GitBranchInfo[], sha: string): RefBadge[] {
  const badges: RefBadge[] = [];
  for (const b of branches) {
    if (b.sha !== sha) continue;
    badges.push({ kind: 'branch', name: b.name, head: b.current });
    // Upstream exactly in sync → its remote ref sits on this commit too.
    if (b.upstream !== undefined && b.upstreamGone !== true && b.ahead === 0 && b.behind === 0) {
      badges.push({ kind: 'remote', name: b.upstream, head: false });
    }
  }
  // HEAD pill first, then locals, then remotes.
  badges.sort((a, b) =>
    a.head !== b.head
      ? a.head
        ? -1
        : 1
      : a.kind !== b.kind
        ? a.kind === 'branch'
          ? -1
          : 1
        : a.name.localeCompare(b.name)
  );
  return badges;
}

function RefPills({ badges }: { badges: RefBadge[] }): React.JSX.Element | null {
  if (badges.length === 0) return null;
  const shown = badges.slice(0, MAX_REF_PILLS);
  const rest = badges.slice(MAX_REF_PILLS);
  return (
    <span className="scm-refs" aria-label={badges.map((b) => b.name).join(', ')}>
      {shown.map((b) =>
        b.kind === 'remote' ? (
          <span key={`r-${b.name}`} className="scm-ref-pill" title={b.name}>
            <Codicon name="cloud" size={10} />
          </span>
        ) : (
          <span
            key={`b-${b.name}`}
            className={`scm-ref-pill${b.head ? ' scm-ref-head' : ''}`}
            title={b.name}
          >
            <Codicon name="git-branch" size={10} />
            <span className="scm-ref-name">{b.name}</span>
          </span>
        )
      )}
      {rest.length > 0 ? (
        <span
          className="scm-ref-pill scm-ref-more num"
          title={rest.map((b) => b.name).join('\n')}
        >
          +{rest.length}
        </span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Commit-file rows (inline expansion)
// ---------------------------------------------------------------------------

function fileBadge(status: GitCommitFileChange['status']): {
  letter: string;
  cls: string;
  word: string;
} {
  switch (status) {
    case 'A':
      return { letter: 'A', cls: 'scm-badge-added', word: 'added' };
    case 'D':
      return { letter: 'D', cls: 'scm-badge-deleted', word: 'deleted' };
    case 'R':
      return { letter: 'R', cls: 'scm-badge-renamed', word: 'renamed' };
    case 'C':
      return { letter: 'C', cls: 'scm-badge-renamed', word: 'copied' };
    case 'U':
      return { letter: '!', cls: 'scm-badge-conflict', word: 'conflicted' };
    case 'M':
    case 'T':
    case 'X':
    default:
      return { letter: 'M', cls: 'scm-badge-modified', word: 'modified' };
  }
}

// ---------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------

type HistItem =
  | { kind: 'commit'; sha: string }
  | { kind: 'file'; sha: string; index: number }
  | { kind: 'more' };

const itemId = (item: HistItem): string =>
  item.kind === 'commit'
    ? `c:${item.sha}`
    : item.kind === 'file'
      ? `f:${item.sha}:${item.index}`
      : 'more';

export function HistorySection({
  repoPath
}: {
  repoPath: string;
}): React.JSX.Element {
  const toast = useApp((s) => s.toast);
  const setMenu = useApp((s) => s.setMenu);
  const setConfirm = useApp((s) => s.setConfirm);
  const gitUiBusy = useGit((s) => s.repos[repoPath]?.refreshing ?? false);

  const depth = useGitDepth();
  const repo = depthRepoState(
    useGitDepth((s) => s.repos),
    repoPath
  );
  const details = useGitDepth((s) => s.details);
  const now = useNow();
  const depthAvailable = useMemo(() => hasGitDepth(), []);

  const [collapsed, setCollapsed] = usePersistedBool(
    `gmux.scm.historyCollapsed.${repoPath}`,
    false
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [modal, setModal] = useState<MiniModalSpec | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  // Lazy-load on first expand of the section.
  useEffect(() => {
    if (!collapsed) depth.ensure(repoPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, repoPath]);

  const entries = repo.log;
  const branches = repo.branches ?? [];
  const remoteUrl = repo.remoteUrl;

  /** "You" for the author-only-when-different rule: the modal author of the
   *  loaded window (no IPC exposes git config user.name — this matches it in
   *  practice on a developer's own checkout, and it is display-only). */
  const primaryAuthor = useMemo(() => {
    if (entries === null || entries.length === 0) return null;
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.authorName, (counts.get(e.authorName) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [name, count] of counts) {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    }
    return best;
  }, [entries]);

  // -- hover card -----------------------------------------------------------

  const [hover, setHover] = useState<{
    sha: string;
    anchor: { top: number; bottom: number; right: number };
  } | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimers = (): void => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const closeCard = useCallback((): void => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
    setHover(null);
  }, []);

  const rowPointerEnter = (entry: GitLogEntry, el: HTMLElement): void => {
    if (!depthAvailable) return;
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    // Returning to the open card's own row keeps it alive; over a different
    // row the pending close (scheduled by the previous leave) runs its
    // course and the new row earns its own card after the full delay.
    if (hover !== null && hover.sha === entry.hash) {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    // Prefetch so the card is complete when the delay elapses (cached).
    void depth.detail(repoPath, entry.hash);
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      if (!el.isConnected) return; // row remounted under a log refresh
      const r = el.getBoundingClientRect();
      setHover({
        sha: entry.hash,
        anchor: { top: r.top, bottom: r.bottom, right: r.right }
      });
    }, HOVER_DELAY_MS);
  };

  const scheduleCardClose = (): void => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    openTimer.current = null;
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setHover(null);
    }, HOVER_CLOSE_GRACE_MS);
  };

  const cardPointerEnter = (): void => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  // Esc dismisses the card before any other layer (capture phase).
  useEffect(() => {
    if (hover === null) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeCard();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hover, closeCard]);

  // Unmount safety: never leave timers running.
  useEffect(() => cancelTimers, []);

  // -- actions ---------------------------------------------------------------

  const toggleExpanded = useCallback(
    (sha: string): void => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(sha)) {
          next.delete(sha);
        } else {
          next.add(sha);
          void depth.detail(repoPath, sha);
        }
        return next;
      });
    },
    [depth, repoPath]
  );

  /**
   * Open one file OF ONE COMMIT. `entry` is not optional decoration — it
   * carries the SHA that decides which two blobs get diffed, so every call
   * site must have the commit in hand.
   */
  const openCommitFile = useCallback(
    (file: GitCommitFileChange, entry: GitLogEntry, preview = true): void => {
      requestOpenFile({
        repoPath,
        relPath: file.path,
        path: `${repoPath}/${file.path}`,
        mode: 'diff',
        source: 'history',
        preview,
        commit: {
          sha: entry.hash,
          shortSha: shortSha(entry.hash),
          status: file.status,
          ...(file.origPath !== undefined ? { origPath: file.origPath } : {}),
          subject: entry.subject
        }
      });
    },
    [repoPath]
  );

  /** Open Changes = the WHOLE commit: one request per changed file, each
   *  pinned (not preview) so they accumulate as tabs instead of replacing
   *  one another. */
  const openChanges = useCallback(
    (entry: GitLogEntry): void => {
      setExpanded((prev) => new Set(prev).add(entry.hash));
      void depth.detail(repoPath, entry.hash).then((detail) => {
        if (detail === null) return;
        if (detail.files.length === 0) {
          toast('info', 'This commit changed no files');
          return;
        }
        for (const file of detail.files) openCommitFile(file, entry, false);
      });
    },
    [depth, repoPath, openCommitFile, toast]
  );

  const copyText = useCallback(
    (text: string, doneToast: string): void => {
      void navigator.clipboard.writeText(text).then(
        () => toast('info', doneToast),
        () => toast('error', 'Could not copy to the clipboard')
      );
    },
    [toast]
  );

  const copyCommitMessage = useCallback(
    (entry: GitLogEntry): void => {
      void depth.detail(repoPath, entry.hash).then((detail) => {
        const message =
          detail !== null
            ? fullMessage(detail.subject, detail.body)
            : entry.subject;
        copyText(message, 'Commit message copied');
      });
    },
    [depth, repoPath, copyText]
  );

  const confirmDetached = useCallback(
    (entry: GitLogEntry): void => {
      const short = shortSha(entry.hash);
      setConfirm({
        title: `Check out ${short} detached?`,
        body: 'HEAD will point at this commit instead of a branch. Switch back to a branch to keep any new commits.',
        confirmLabel: 'Check out',
        onConfirm: () => void depth.checkoutDetached(repoPath, entry.hash)
      });
    },
    [depth, repoPath, setConfirm]
  );

  const branchFromCommit = useCallback(
    (entry: GitLogEntry): void => {
      const short = shortSha(entry.hash);
      setModal({
        title: 'Create branch',
        placeholder: 'branch-name',
        caption: `from ${short}`,
        submit: (name) => depth.createBranch(repoPath, name, entry.hash)
      });
    },
    [depth, repoPath]
  );

  const tagFromCommit = useCallback(
    (entry: GitLogEntry): void => {
      const short = shortSha(entry.hash);
      setModal({
        title: 'Create tag',
        placeholder: 'tag-name',
        caption: `at ${short}`,
        submit: (name) => depth.createTag(repoPath, name, entry.hash)
      });
    },
    [depth, repoPath]
  );

  /** The S3A context menu — order and separators fixed by the spec. */
  const onRowContextMenu = (e: React.MouseEvent, entry: GitLogEntry): void => {
    e.preventDefault();
    e.stopPropagation();
    closeCard();
    const items: (MenuItemSpec | 'sep')[] = [
      { label: 'Open Changes', run: () => openChanges(entry) }
    ];
    if (remoteUrl !== null) {
      items.push({
        label: 'Open on GitHub',
        run: () => {
          window.open(`${remoteUrl}/commit/${entry.hash}`, '_blank');
        }
      });
    }
    if (depthAvailable) {
      items.push(
        'sep',
        { label: 'Checkout (Detached)', run: () => confirmDetached(entry) },
        'sep',
        { label: 'Create Branch…', run: () => branchFromCommit(entry) },
        'sep',
        { label: 'Create Tag…', run: () => tagFromCommit(entry) },
        'sep',
        {
          label: 'Cherry Pick',
          run: () => void depth.cherryPick(repoPath, entry.hash)
        }
      );
    }
    items.push(
      'sep',
      {
        label: 'Copy Commit ID',
        run: () => copyText(entry.hash, 'Commit ID copied')
      },
      {
        label: 'Copy Commit Message',
        run: () => copyCommitMessage(entry)
      }
    );
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  // -- keyboard navigation ----------------------------------------------------

  const items = useMemo<HistItem[]>(() => {
    if (entries === null) return [];
    const list: HistItem[] = [];
    for (const entry of entries) {
      list.push({ kind: 'commit', sha: entry.hash });
      if (expanded.has(entry.hash)) {
        const detail = details[detailKey(repoPath, entry.hash)];
        if (detail !== undefined) {
          detail.files.forEach((_f, i) =>
            list.push({ kind: 'file', sha: entry.hash, index: i })
          );
        }
      }
    }
    if (repo.hasMore) list.push({ kind: 'more' });
    return list;
  }, [entries, expanded, details, repoPath, repo.hasMore]);

  const entryBySha = useMemo(() => {
    const map = new Map<string, GitLogEntry>();
    for (const e of entries ?? []) map.set(e.hash, e);
    return map;
  }, [entries]);

  const moveCursor = (delta: 1 | -1): void => {
    if (items.length === 0) return;
    const idx = items.findIndex((it) => itemId(it) === cursor);
    const nextIdx =
      idx === -1
        ? delta === 1
          ? 0
          : items.length - 1
        : Math.min(Math.max(idx + delta, 0), items.length - 1);
    const next = items[nextIdx];
    if (next === undefined) return;
    const id = itemId(next);
    setCursor(id);
    listRef.current
      ?.querySelector(`[data-hist="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  };

  const onListKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveCursor(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    const current = items.find((it) => itemId(it) === cursor) ?? items[0];
    if (current === undefined) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (current.kind === 'commit') toggleExpanded(current.sha);
      else if (current.kind === 'file') {
        const detail = details[detailKey(repoPath, current.sha)];
        const file = detail?.files[current.index];
        const entry = entryBySha.get(current.sha);
        // ↩ is an explicit activation (VS Code pins on it), so preview:false.
        if (file !== undefined && entry !== undefined) {
          openCommitFile(file, entry, false);
        }
      } else void depth.loadMore(repoPath);
    } else if (e.key === 'ArrowRight' && current.kind === 'commit') {
      e.preventDefault();
      if (!expanded.has(current.sha)) toggleExpanded(current.sha);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (current.kind === 'commit' && expanded.has(current.sha)) {
        toggleExpanded(current.sha);
      } else if (current.kind === 'file') {
        const id = itemId({ kind: 'commit', sha: current.sha });
        setCursor(id);
        listRef.current
          ?.querySelector(`[data-hist="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  // -- render ------------------------------------------------------------------

  const headSha = entries?.[0]?.hash ?? null;
  const hoverEntry = hover !== null ? (entryBySha.get(hover.sha) ?? null) : null;

  const renderCommitRow = (entry: GitLogEntry): React.JSX.Element => {
    const sha = entry.hash;
    const isExpanded = expanded.has(sha);
    const isMerge = entry.parents.length > 1;
    const isHead = sha === headSha;
    const badges = badgesFor(branches, sha);
    const id = itemId({ kind: 'commit', sha });
    const detail = details[detailKey(repoPath, sha)];
    const showAuthor =
      primaryAuthor !== null && entry.authorName !== primaryAuthor;

    return (
      <React.Fragment key={sha}>
        <div
          role="option"
          aria-selected={cursor === id}
          aria-expanded={isExpanded}
          aria-label={`${entry.subject}, ${entry.authorName}`}
          data-hist={id}
          className={[
            'scm-hrow',
            cursor === id ? 'selected' : '',
            isExpanded ? 'expanded' : ''
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            setCursor(id);
            closeCard();
            toggleExpanded(sha);
          }}
          onContextMenu={(e) => onRowContextMenu(e, entry)}
          onMouseEnter={(e) => rowPointerEnter(entry, e.currentTarget)}
          onMouseLeave={scheduleCardClose}
        >
          <span
            className={[
              'scm-hrail',
              isHead ? 'head' : '',
              isMerge ? 'merge' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            <span className="scm-hdot" />
          </span>
          <span className="scm-hchevron" aria-hidden="true">
            <Codicon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={12}
            />
          </span>
          <span className="scm-hsubject">{entry.subject}</span>
          {showAuthor ? (
            <span className="scm-hauthor">{entry.authorName}</span>
          ) : null}
          <span className="scm-row-space" />
          <RefPills badges={badges} />
          <span className="scm-hage num">
            {formatRelative(entry.authorDate, now)}
          </span>
        </div>
        {isExpanded
          ? detail === undefined
            ? (
              <div className="scm-hfile scm-hfile-loading" aria-hidden="true">
                <span className="scm-skeleton-row" style={{ width: '56%' }} />
              </div>
            )
            : detail.files.length === 0
              ? (
                <div className="scm-hfile scm-hfile-empty">
                  No files changed
                </div>
              )
              : detail.files.map((file, index) => {
                  const fid = itemId({ kind: 'file', sha, index });
                  const badge = fileBadge(file.status);
                  const { dir, base } = splitPath(file.path);
                  return (
                    <div
                      key={fid}
                      role="option"
                      aria-selected={cursor === fid}
                      aria-label={`${base}, ${badge.word}`}
                      data-hist={fid}
                      className={`scm-hfile${cursor === fid ? ' selected' : ''}`}
                      title={
                        file.origPath !== undefined
                          ? `${file.path} — renamed from ${file.origPath}`
                          : file.path
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setCursor(fid);
                        openCommitFile(file, entry);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        openCommitFile(file, entry, false);
                      }}
                    >
                      <span
                        className={`scm-badge ${badge.cls}`}
                        aria-hidden="true"
                      >
                        {badge.letter}
                      </span>
                      <span
                        className={`scm-row-name${file.status === 'D' ? ' deleted' : ''}`}
                      >
                        {base}
                      </span>
                      {dir !== '' ? (
                        <span className="scm-row-dir">{dir}</span>
                      ) : null}
                    </div>
                  );
                })
          : null}
      </React.Fragment>
    );
  };

  return (
    <section
      className={`section-scm-history${collapsed ? ' collapsed' : ''}`}
      data-section-root="history"
    >
      <div
        className={`section-header${collapsed ? ' collapsed' : ''}`}
        data-section="history"
      >
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="section-chevron">
            <Codicon name="chevron-down" size={12} />
          </span>
          History
          <span className="section-count num">
            {entries !== null && entries.length > 0 ? entries.length : ''}
          </span>
        </button>
        <span className="section-spacer" />
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size={14} />
        </span>
      </div>
      {!collapsed ? (
        <div
          ref={listRef}
          className="section-body scm-history-body"
          role="listbox"
          aria-label="Commit history"
          tabIndex={0}
          onKeyDown={onListKeyDown}
          onScroll={closeCard}
        >
          {repo.logLoading && entries === null ? (
            <div className="scm-skeleton" aria-hidden="true">
              <div className="scm-skeleton-row" style={{ width: '72%' }} />
              <div className="scm-skeleton-row" style={{ width: '58%' }} />
              <div className="scm-skeleton-row" style={{ width: '80%' }} />
            </div>
          ) : entries === null || entries.length === 0 ? (
            <div className="section-stub">
              No commits yet — your first commit starts the history.
            </div>
          ) : (
            <>
              {entries.map(renderCommitRow)}
              {repo.hasMore ? (
                <button
                  type="button"
                  data-hist="more"
                  className={`scm-load-more${cursor === 'more' ? ' selected' : ''}`}
                  disabled={repo.logLoading || gitUiBusy}
                  onClick={() => {
                    setCursor('more');
                    void depth.loadMore(repoPath);
                  }}
                >
                  {repo.logLoading ? 'Loading…' : 'Load 50 more'}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {hover !== null && hoverEntry !== null ? (
        <HoverCard
          repoPath={repoPath}
          entry={hoverEntry}
          anchor={hover.anchor}
          remoteUrl={remoteUrl}
          now={now}
          onPointerEnter={cardPointerEnter}
          onPointerLeave={scheduleCardClose}
        />
      ) : null}
      {modal !== null ? (
        <MiniModal spec={modal} onClose={() => setModal(null)} />
      ) : null}
    </section>
  );
}
