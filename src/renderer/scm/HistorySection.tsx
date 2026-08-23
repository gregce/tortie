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
 * PHASE 14.5 — the list is now a REF-SCOPED walk (`git:graphLog`), chosen on
 * the header: "This branch + upstream" (default) / "All local branches" /
 * "Everything". Three consequences, all of them the point:
 *
 *  - Commits you are BEHIND by are in the payload for the first time. The old
 *    walk started at HEAD, so `origin/main` being ahead of you was literally
 *    unrenderable. `entries[0]` is therefore no longer necessarily HEAD —
 *    `divergence.headSha` is.
 *  - Ref badges ride the walk itself (`--decorate=full`), so they are pinned
 *    to the commits they actually decorate, tags included, and cannot drift
 *    from the log. `main` on one row and `origin/main` two rows below it is
 *    the whole "2 unpushed" sentence (ref-badges.tsx).
 *  - Each row knows which side of the divergence it is on, so unpushed work
 *    is shaded rather than merely counted in the header band.
 *
 * The single-column rail is also gone: `./graph` folds the walk into swimlanes
 * and `CommitGraph` draws ONE self-contained `<svg>` per row, so merges,
 * concurrent branches and lane colour are visible without any row needing to
 * know about its neighbours. That last property is load-bearing — it is what
 * keeps the list virtualizable and what makes "Load 50 more" an append that
 * cannot reshuffle a lane already under the user's eyes.
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
  GitCommitFileChange,
  GitGraphLogEntry,
  GitLogEntry
} from '@shared/types';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { useGit } from '../state/git';
import { useNow } from '../format';
import { Codicon } from '../icons';
import {
  depthRepoState,
  detailKey,
  hasGitDepth,
  hasGitGraph,
  useGitDepth
} from './depth';
import { CommitGraph, CommitGraphSpacer, useLaneCap } from './graph/CommitGraph';
import { GRAPH_SCOPE_ATTR, rowColumns } from './graph/geometry';
import { GraphGutterControl, useGraphGutter } from './GraphGutterControl';
import { capRow, gutterColumns, layoutGraph, makeRoleResolver } from './graph';
import type { CappedRow, GraphLayout, GraphRow } from './graph';
import { formatRelative, fullMessage, shortSha, splitPath } from './format';
import { requestOpenFile } from './open-file';
import { usePersistedBool } from './sections';
import {
  badgesFromRefs,
  badgesFromTips,
  refsAriaClause,
  RefPills
} from './ref-badges';
import type { RefBadge } from './ref-badges';
import { scopeTag, usePersistedScope } from './history-scope';
import { HistoryScopeControl } from './HistoryScopeControl';
import { HoverCard } from './HoverCard';
import { MiniModal } from './MiniModal';
import type { MiniModalSpec } from './MiniModal';

/** DESIGN.md §3 commit row: hover card after 600ms. */
const HOVER_DELAY_MS = 600;
/** Leave grace before the card closes (pointer may travel into it). */
const HOVER_CLOSE_GRACE_MS = 100;

/**
 * Which side of the divergence a commit is on, in words.
 *
 * `unpushed` / `unpulled` are LEFT/RIGHT membership of `HEAD...@{u}` — the
 * same symmetric difference git counts ahead/behind from, resolved in the
 * same round trip as the commits, so a row can never disagree with the
 * header's number. Null for the overwhelming majority of commits: both sides
 * already have them, which needs no comment.
 */
function syncNoteFor(
  entry: GitGraphLogEntry,
  upstream: string | null
): string | null {
  if (entry.unpushed === true) return 'Not pushed yet — only on this machine';
  if (entry.unpulled === true) {
    return `Not pulled yet — on ${upstream ?? 'the remote'}, not in your branch`;
  }
  return null;
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
  const [scope, setScope] = usePersistedScope(repoPath);
  const [gutter, setGutter] = useGraphGutter();
  const graphAvailable = useMemo(() => hasGitGraph(), []);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [modal, setModal] = useState<MiniModalSpec | null>(null);

  /**
   * The list body, held BOTH ways on purpose: as a ref for the imperative
   * reads (keyboard navigation's `scrollIntoView`) and as state, because the
   * body unmounts when the section collapses and the gutter's width has to be
   * re-measured when it comes back (see `useLaneCap`).
   */
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const attachList = useCallback((node: HTMLDivElement | null): void => {
    listRef.current = node;
    setListEl(node);
  }, []);

  // Lazy-load on first expand of the section, at the persisted scope.
  useEffect(() => {
    if (!collapsed) depth.ensure(repoPath, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, repoPath]);

  // Keep the walk matching what the header says it is. On mount this no-ops
  // (ensure seeded the same value); it does the work when the user picks.
  useEffect(() => {
    if (!collapsed) void depth.setLogScope(repoPath, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, repoPath, scope]);

  const entries = repo.log;
  const branches = repo.branches ?? [];
  const remoteUrl = repo.remoteUrl;
  const divergence = repo.divergence;
  const lastFetchedAt = repo.lastFetchedAt;

  /**
   * The current branch's upstream — used only to RANK ref pills, so that the
   * one pill answering "where is the remote?" is never the one truncation
   * eats (research §4.3). Three sources in falling order of authority: the
   * walk's own divergence block, `git:remotes`, then the branch list.
   */
  const upstream = useMemo(
    () =>
      divergence?.upstream ??
      repo.upstream ??
      branches.find((b) => b.current)?.upstream ??
      null,
    [divergence, repo.upstream, branches]
  );

  // -- the graph ------------------------------------------------------------
  //
  // Three pure steps, in this order and nowhere else:
  //
  //   layoutGraph  swimlane fold over the walk        → lanes + colours
  //   useLaneCap   how many columns this pane affords → cap
  //   capRow       fold the surplus into one marker   → what the SVG draws
  //
  // The fold is what makes paging safe: row n depends only on commits 0..n, so
  // "Load 50 more" cannot reshuffle a lane already on screen — PROVIDED the ref
  // set is pinned between pages (depth.ts holds `logRefs` for exactly that) and
  // `roleOf` answers the same way each render, which is why it is derived from
  // the divergence SNAPSHOT that arrived with the page rather than re-resolved.

  /** Fixes the three divergence colours; undefined when there is no upstream. */
  const roleOf = useMemo(() => makeRoleResolver(divergence), [divergence]);

  const layout: GraphLayout = useMemo(
    () => layoutGraph(entries ?? [], roleOf === undefined ? {} : { roleOf }),
    [entries, roleOf]
  );

  /**
   * WIDE mode, the default. One gutter width for the whole loaded window,
   * measured off the list's own box. Per-row widths (what VS Code does)
   * start every subject at a different x, which is why wide stays the
   * default.
   *
   * COMPACT mode is the operator's explicit request from Phase 47, with VS
   * Code's Graph view as the reference. Each row's SVG gets only the width
   * its own lanes need. That is `rowColumns` clamped to the window's
   * `columns`, so compact can only shrink a row. Subjects then hug the
   * lanes, and the per-row x jitter this comment once rejected is the
   * requested behavior, not a defect. The layout and the fold run the same
   * in both modes. Only the width the renderer grants each row changes.
   */
  const cap = useLaneCap(listEl, layout.maxLanes);
  const columns = gutterColumns(layout, cap);

  /**
   * Columns a spacer row (file rows, "Load 50 more", the tail fade) gets.
   * Compact hugs the lanes still live at that point. Wide is the shared
   * window width. Never below one, so the rail never disappears.
   */
  const spacerColumns = (laneCount: number): number =>
    gutter === 'compact' ? Math.max(1, Math.min(laneCount, columns)) : columns;

  /**
   * The graph row for each commit, keyed by SHA because the list renders
   * `entries` while the fold is indexed.
   *
   * `capped` is what the gutter draws; `full` survives alongside it for the
   * dot's own colour (a commit folded ONTO the marker column has no output lane
   * there to read one from, but it still wears its own hue) and for the
   * continuation lanes an expanded commit's file rows draw.
   */
  const graphBySha = useMemo(() => {
    const map = new Map<string, { full: GraphRow; capped: CappedRow }>();
    for (const row of layout.rows) {
      map.set(row.hash, { full: row, capped: capRow(row, columns) });
    }
    return map;
  }, [layout, columns]);

  /**
   * Ref badges per commit, computed once for the window.
   *
   * The good path reads the walk's own typed decorations. The fallback exists
   * for a preload without `git:graphLog` and is strictly weaker (no tags, and
   * two reads that can drift) — but it no longer hides the remote pill behind
   * the `ahead === 0 && behind === 0` guard that made the divergence
   * invisible.
   */
  const badgesBySha = useMemo(() => {
    const map = new Map<string, RefBadge[]>();
    for (const entry of entries ?? []) {
      const badges = graphAvailable
        ? badgesFromRefs(entry.refs, upstream)
        : badgesFromTips(branches, repo.remoteBranches, entry.hash, upstream);
      if (badges.length > 0) map.set(entry.hash, badges);
    }
    return map;
  }, [entries, graphAvailable, branches, repo.remoteBranches, upstream]);

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
    const map = new Map<string, GitGraphLogEntry>();
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

  /**
   * HEAD's row. With the ref-scoped walk `entries[0]` can be a commit you do
   * not have yet (you are behind, and the upstream's tip sorts first), so the
   * divergence block is the authority; the flat-walk fallback keeps the old
   * rule, where the first row genuinely was HEAD.
   */
  const headSha = divergence?.headSha ?? entries?.[0]?.hash ?? null;
  const hoverEntry = hover !== null ? (entryBySha.get(hover.sha) ?? null) : null;

  const renderCommitRow = (entry: GitGraphLogEntry): React.JSX.Element => {
    const sha = entry.hash;
    const isExpanded = expanded.has(sha);
    const isMerge = entry.parents.length > 1;
    const isHead = sha === headSha;
    const graph = graphBySha.get(sha);
    const badges = badgesBySha.get(sha) ?? [];
    const id = itemId({ kind: 'commit', sha });
    const detail = details[detailKey(repoPath, sha)];
    const showAuthor =
      primaryAuthor !== null && entry.authorName !== primaryAuthor;

    /**
     * Which side of the divergence this commit is on — the row's shading, and
     * the attribute the graph gutter keys its dot fill off.
     *
     * The two flags come from the same `HEAD...@{u}` symmetric difference git
     * counts ahead/behind from, in the same round trip as the commits, so a
     * shaded row and the header's "↑2" cannot describe different instants.
     */
    const sync =
      entry.unpushed === true
        ? 'unpushed'
        : entry.unpulled === true
          ? 'unpulled'
          : undefined;
    // Quiet prose, not jargon: the row says what is true about it, once.
    const syncWord =
      sync === 'unpushed'
        ? 'not pushed yet'
        : sync === 'unpulled'
          ? 'not pulled yet'
          : '';

    /**
     * The width this row's gutter is granted. Wide mode hands every row the
     * shared window width. Compact hands it only what its own lanes need.
     */
    const graphColumns =
      gutter === 'compact' && graph !== undefined
        ? Math.min(rowColumns(graph.capped), columns)
        : columns;

    /**
     * The gutter for this commit's inline file rows: every lane still live
     * below it, drawn as a plain pass-through. Without it, expanding a commit
     * visibly severs the spine — which is what today's rail-less file rows do.
     */
    const laneSpacer =
      graph === undefined ? null : (
        <CommitGraphSpacer
          lanes={graph.full.out}
          columns={spacerColumns(graph.full.out.length)}
        />
      );

    return (
      <React.Fragment key={sha}>
        <div
          role="option"
          aria-selected={cursor === id}
          aria-expanded={isExpanded}
          // The graph gutter is aria-hidden and the age can be shed for
          // width, so the accessible name is where both of those live.
          aria-label={`${entry.subject}, ${entry.authorName}, ${formatRelative(
            entry.authorDate,
            now
          )}${isMerge ? `, merge of ${entry.parents.length} parents` : ''}${refsAriaClause(
            badges
          )}${sync !== undefined ? `, ${syncWord}` : ''}${
            // The gutter is aria-hidden, so a folded lane has to say so here or
            // the picture and the accessible name disagree about the topology.
            graph !== undefined && graph.capped.bundleColumn >= 0
              ? ', more branches than fit'
              : ''
          }`}
          data-hist={id}
          {...(sync !== undefined ? { 'data-sync': sync } : {})}
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
          {graph !== undefined ? (
            <CommitGraph
              row={graph.capped}
              sha={sha}
              parentCount={entry.parents.length}
              columns={graphColumns}
              color={graph.full.color}
              isHead={isHead}
              unpushed={entry.unpushed === true}
            />
          ) : null}
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
          <RefPills badges={badges} lastFetchedAt={lastFetchedAt} now={now} />
          <span className="scm-hage num">
            {formatRelative(entry.authorDate, now)}
          </span>
        </div>
        {isExpanded
          ? detail === undefined
            ? (
              <div className="scm-hfile scm-hfile-loading" aria-hidden="true">
                {laneSpacer}
                <span className="scm-skeleton-row" style={{ width: '56%' }} />
              </div>
            )
            : detail.files.length === 0
              ? (
                <div className="scm-hfile scm-hfile-empty">
                  {laneSpacer}
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
                      {laneSpacer}
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
        {/* A widened scope changes what this list CONTAINS — commits from
            branches you are not on. Naming it in the header is the honesty
            half of the control; the accessory alone would hide the fact. */}
        {graphAvailable && scopeTag(scope) !== '' ? (
          <span className="scm-scope-tag">{scopeTag(scope)}</span>
        ) : null}
        <span className="section-spacer" />
        {graphAvailable ? (
          <>
            <HistoryScopeControl
              scope={scope}
              onPick={setScope}
              disabled={repo.logLoading}
            />
            <GraphGutterControl mode={gutter} onPick={setGutter} />
          </>
        ) : null}
        <span className="section-gripper" aria-hidden="true">
          <Codicon name="gripper" size={14} />
        </span>
      </div>
      {!collapsed ? (
        <div
          ref={attachList}
          className="section-body scm-history-body"
          role="listbox"
          aria-label="Commit history"
          tabIndex={0}
          // Lane emphasis is written here, not on the row: pointing at a lane
          // should hold that lane bright down the WHOLE list, which is how you
          // follow a branch past the merges that cross it.
          {...{ [GRAPH_SCOPE_ATTR]: '' }}
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
                  {/* The open lanes run THROUGH the paging row, so the graph
                      reads as continuing into the next page rather than
                      stopping at the button. */}
                  <CommitGraphSpacer
                    lanes={layout.tailLanes}
                    columns={spacerColumns(layout.tailLanes.length)}
                  />
                  {repo.logLoading ? 'Loading…' : 'Load 50 more'}
                </button>
              ) : layout.tailLanes.length > 0 ? (
                /* The walk is genuinely exhausted and lanes are still open:
                   they await commits the REF FILTER excluded, not commits a
                   further page would bring in. Fading says "elsewhere"; a hard
                   stop would say "this branch ends here", which is false. */
                <div className="scm-history-tail" aria-hidden="true">
                  <CommitGraphSpacer
                    lanes={layout.tailLanes}
                    columns={spacerColumns(layout.tailLanes.length)}
                    fade
                  />
                </div>
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
          // Where "+2" resolves properly: full names, no truncation, and
          // reachable without hunting for a title attribute.
          refs={badgesBySha.get(hoverEntry.hash) ?? []}
          lastFetchedAt={lastFetchedAt}
          // A grey dot vs a lit one is a fast read but a silent one; the card
          // is where it gets words. Deliberately NOT a row `title`: a native
          // tooltip would fight the card that is already opening.
          syncNote={syncNoteFor(hoverEntry, upstream)}
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
