/**
 * Commit hover card (DESIGN-SPEC S3A) — the rich card from the VS Code
 * reference screenshot: author + relative/absolute date, the FULL commit
 * message formatted (markdown-lite), a files-changed stat line, and a
 * short-SHA row with copy + "Open on GitHub".
 *
 * Rendered in a body portal (position: fixed escapes the sidebar's
 * overflow), anchored 8px right of the sidebar edge, top-aligned to the
 * row; flips upward instead of clipping the window bottom. Interactive —
 * the parent keeps it open while the pointer is inside (100ms leave grace)
 * and dismisses on Esc.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GitCommitDetail, GitLogEntry } from '@shared/types';
import { useApp } from '../state/store';
import { Codicon } from '../icons';
import { detailKey, useGitDepth } from './depth';
import { formatAbsolute, formatRelativeLong, shortSha } from './format';
import { FormattedMessage } from './message-format';
import { RefPills } from './ref-badges';
import type { RefBadge } from './ref-badges';

/** Viewport inset the card never crosses (px). */
const EDGE = 8;
const CARD_WIDTH = 520;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function StatLine({ detail }: { detail: GitCommitDetail }): React.JSX.Element {
  const files = detail.files.length;
  return (
    <div className="scm-card-stat">
      <span className="scm-card-stat-files">
        {files} {files === 1 ? 'file' : 'files'} changed
      </span>
      {detail.insertions > 0 ? (
        <span className="scm-card-stat-add">
          , {detail.insertions} {detail.insertions === 1 ? 'insertion' : 'insertions'}(+)
        </span>
      ) : null}
      {detail.deletions > 0 ? (
        <span className="scm-card-stat-del">
          , {detail.deletions} {detail.deletions === 1 ? 'deletion' : 'deletions'}(-)
        </span>
      ) : null}
    </div>
  );
}

export function HoverCard({
  repoPath,
  entry,
  anchor,
  remoteUrl,
  now,
  refs = [],
  lastFetchedAt = null,
  syncNote = null,
  onPointerEnter,
  onPointerLeave
}: {
  repoPath: string;
  entry: GitLogEntry;
  /** The hovered row's bounding rect at trigger time. */
  anchor: { top: number; bottom: number; right: number };
  remoteUrl: string | null;
  now: number;
  /**
   * Every ref on this commit, in priority order. The row can only show three
   * before "+n"; the card is where the overflow resolves, at full width and
   * with real tooltips instead of a newline-joined `title` string.
   */
  refs?: readonly RefBadge[];
  /** Remote snapshot age, so the card's remote pills say when we last looked. */
  lastFetchedAt?: number | null;
  /**
   * "Not pushed yet …" / "Not pulled yet …", when this commit is on only one
   * side of the divergence. The row says it with a dot fill, which is fast to
   * read but silent; this is where it gets words.
   */
  syncNote?: string | null;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}): React.JSX.Element {
  const toast = useApp((s) => s.toast);
  const detail = useGitDepth(
    (s) => s.details[detailKey(repoPath, entry.hash)] ?? null
  );

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number>(anchor.top);

  // Measure after render; flip upward when the card would clip the bottom.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (el === null) return;
    const h = el.offsetHeight;
    let next = anchor.top;
    if (next + h > window.innerHeight - EDGE) {
      next = Math.max(EDGE, Math.min(anchor.bottom, window.innerHeight - EDGE) - h);
    }
    setTop(next);
  }, [anchor, detail]);

  const left = anchor.right + EDGE;
  const width = Math.min(CARD_WIDTH, Math.max(280, window.innerWidth - left - EDGE));

  const short = shortSha(entry.hash);
  const author = detail?.author ?? entry.authorName;
  const dateMs = useMemo(
    () => (detail !== null ? Date.parse(detail.dateISO) : entry.authorDate),
    [detail, entry.authorDate]
  );

  const copyFullSha = (): void => {
    void navigator.clipboard.writeText(entry.hash).then(
      () => toast('info', 'Commit ID copied'),
      () => toast('error', 'Could not copy the commit ID')
    );
  };

  return createPortal(
    <div
      ref={cardRef}
      className="scm-card"
      role="dialog"
      aria-label={`Commit ${short}`}
      style={{ left, top, width }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <div className="scm-card-header">
        <span className="scm-card-avatar" aria-hidden="true">
          {initialsOf(author)}
        </span>
        <span className="scm-card-author">{author}</span>
        <span className="scm-card-age">{formatRelativeLong(dateMs, now)}</span>
        <span className="scm-card-date">({formatAbsolute(dateMs)})</span>
      </div>
      <div className="scm-card-body">
        {detail !== null ? (
          <FormattedMessage
            subject={detail.subject}
            body={detail.body}
            remoteUrl={remoteUrl}
          />
        ) : (
          <>
            <p className="scm-card-subject">{entry.subject}</p>
            <div className="scm-skeleton scm-card-skeleton" aria-hidden="true">
              <div className="scm-skeleton-row" style={{ width: '82%' }} />
              <div className="scm-skeleton-row" style={{ width: '64%' }} />
              <div className="scm-skeleton-row" style={{ width: '40%' }} />
            </div>
          </>
        )}
      </div>
      {detail !== null ? <StatLine detail={detail} /> : null}
      {syncNote !== null ? (
        <div className="scm-card-sync">{syncNote}</div>
      ) : null}
      {refs.length > 0 ? (
        <div className="scm-card-refs">
          <RefPills
            badges={refs}
            lastFetchedAt={lastFetchedAt}
            now={now}
            full
          />
        </div>
      ) : null}
      <div className="scm-card-sha-row">
        <button
          type="button"
          className="scm-card-sha"
          title="Copy commit ID"
          aria-label={`Copy commit ID ${short}`}
          onClick={copyFullSha}
        >
          <Codicon name="copy" size={14} />
          <span className="num">{short}</span>
        </button>
        <span className="scm-row-space" />
        {remoteUrl !== null ? (
          <a
            className="scm-card-github"
            href={`${remoteUrl}/commit/${entry.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            <Codicon name="globe" size={14} />
            Open on GitHub
          </a>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
