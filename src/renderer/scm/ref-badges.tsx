/**
 * Ref badges for the history list — Phase 14.5, design research
 * docs/research/24-git-graph-d3-visual-design.md §4.
 *
 * A pill pinned to the commit it actually decorates is the whole divergence
 * story: `main` on one row and `origin/main` two rows below it IS the
 * sentence "you have two unpushed commits" (§5.1). Nothing else has to be
 * invented — but three shipped behaviours had to go for it to be true:
 *
 *  1. The remote pill was emitted ONLY when `ahead === 0 && behind === 0`,
 *     i.e. only when it duplicated the local pill, and was suppressed exactly
 *     when it carried information. Deleted (HistorySection.tsx:80-82).
 *  2. Every badge was cross-referenced by SHA against a separate branch
 *     query, so tags never appeared at all and the two lists could drift.
 *     Decorations now ride the log walk itself (`--decorate=full` + `%D`) and
 *     arrive typed. `badgesFromTips` survives only as the older-preload path.
 *  3. Badges sorted alphabetically and truncated at two, which on the one
 *     commit where divergence matters would hide `origin/dev` behind "+3".
 *     §4.3's priority order fixes that: HEAD's branch and its upstream can
 *     never fall into the overflow.
 *
 * Measured constraint driving the visual vocabulary (§4.1): `--bg-raised` on
 * `--bg-sidebar` is 1.16:1, and on a HOVERED row (also `--bg-raised`) the
 * shipped pill fill was 1.00:1 — the pill body vanished. Fill and border are
 * therefore not the channels. Local vs remote is carried by three things that
 * survive greyscale and CVD: the glyph (git-branch vs cloud), a solid vs
 * DASHED border, and the dimmed `remote/` prefix. Tags add a fourth: an
 * asymmetric flag radius.
 */

import React from 'react';
import type {
  GitBranchInfo,
  GitDecorationRef,
  GitRemoteBranchInfo
} from '@shared/types';
import { Codicon } from '../icons';
import { remoteRefTitle } from './freshness';

/**
 * Pills laid out before the overflow chip.
 *
 * Fixed at three rather than measured per row. §4.4 specifies a width-derived
 * count, but measuring each row would cost a layout pass per commit and give
 * up the constant 24px row height the graph gutter and any future windowing
 * layer both depend on. Three pills that SHRINK (each capped at 96px, names
 * middle-truncating, icon-only below a 260px container) reach the same place
 * without measuring: at the 220px sidebar minimum three icon-only pills are
 * 54px, and the message column still clears its 48px floor on a ref-carrying
 * row.
 */
const MAX_REF_PILLS = 3;

/**
 * Names longer than this middle-truncate. Below it the whole name fits in the
 * 96px pill at 10px mono, so splitting it would only add a `…`.
 */
const TRUNCATE_OVER = 12;
/** Characters of the tail a middle-truncated name always keeps. */
const TAIL_CHARS = 8;

/** Natural-order comparison, so `v2.10.0` sorts after `v2.9.0`. */
const naturalOrder = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

export type RefBadgeKind =
  | 'localBranch'
  | 'remoteBranch'
  | 'tag'
  /** A bare `HEAD` decoration — HEAD is detached at this commit. */
  | 'detachedHead';

export interface RefBadge {
  kind: RefBadgeKind;
  /** Full display name: "main", "origin/main", "v1.2.0", "HEAD". */
  name: string;
  /** Remote prefix rendered dimmed ("origin/"); empty for everything else. */
  prefix: string;
  /** The part after `prefix` — what middle-truncates. */
  label: string;
  /** HEAD's own branch (or the detached-HEAD marker): the emphasised pill. */
  head: boolean;
  /** HEAD's branch's upstream — rank 2, and never allowed into the overflow. */
  upstream: boolean;
}

/**
 * §4.3 priority. Ranks 0-2 are the divergence story and sort ahead of
 * everything, so they cannot be the pills that get hidden.
 *
 *   0 detached HEAD · 1 HEAD's branch · 2 its upstream
 *   3 other local branches · 4 tags · 5 other remote branches
 */
function rankOf(b: RefBadge): number {
  if (b.kind === 'detachedHead') return 0;
  if (b.head) return 1;
  if (b.upstream) return 2;
  if (b.kind === 'localBranch') return 3;
  if (b.kind === 'tag') return 4;
  return 5;
}

function compareBadges(a: RefBadge, b: RefBadge): number {
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra !== rb) return ra - rb;
  // Tags newest first (a release list reads downwards); everything else A-Z.
  if (ra === 4) return naturalOrder.compare(b.name, a.name);
  return naturalOrder.compare(a.name, b.name);
}

function remotePrefix(name: string, remote: string | undefined): string {
  if (remote !== undefined && name.startsWith(`${remote}/`)) {
    return `${remote}/`;
  }
  const slash = name.indexOf('/');
  return slash === -1 ? '' : name.slice(0, slash + 1);
}

/**
 * Badges from the walk's own typed decorations — the good path.
 *
 * `upstream` is the current branch's upstream short name ("origin/dev"), used
 * only for ranking: the pill that answers "where is the remote?" must never
 * be the one truncation eats.
 */
export function badgesFromRefs(
  refs: readonly GitDecorationRef[],
  upstream: string | null
): RefBadge[] {
  const badges: RefBadge[] = [];
  for (const ref of refs) {
    if (ref.kind === 'head') {
      badges.push({
        kind: 'detachedHead',
        name: 'HEAD',
        prefix: '',
        label: 'HEAD',
        head: true,
        upstream: false
      });
      continue;
    }
    if (ref.kind === 'remoteBranch') {
      const prefix = remotePrefix(ref.name, ref.remote);
      badges.push({
        kind: 'remoteBranch',
        name: ref.name,
        prefix,
        label: ref.name.slice(prefix.length),
        head: false,
        upstream: upstream !== null && ref.name === upstream
      });
      continue;
    }
    badges.push({
      kind: ref.kind === 'tag' ? 'tag' : 'localBranch',
      name: ref.name,
      prefix: '',
      label: ref.name,
      head: ref.kind === 'localBranch' && ref.current === true,
      upstream: false
    });
  }
  return badges.sort(compareBadges);
}

/**
 * Badges from branch TIPS, for a preload without `git:graphLog`.
 *
 * Strictly worse and knowingly so: it cannot see tags (no listing channel),
 * and it can drift from the log because the two reads are separate. It exists
 * so an older preload degrades to the round-1 surface instead of losing ref
 * badges altogether. The `ahead === 0 && behind === 0` suppression is NOT
 * carried over — the remote tip is looked up by its own SHA, which is what
 * puts it on its own row.
 */
export function badgesFromTips(
  branches: readonly GitBranchInfo[],
  remoteBranches: readonly GitRemoteBranchInfo[] | null,
  sha: string,
  upstream: string | null
): RefBadge[] {
  const badges: RefBadge[] = [];
  for (const b of branches) {
    if (b.sha !== sha) continue;
    badges.push({
      kind: 'localBranch',
      name: b.name,
      prefix: '',
      label: b.name,
      head: b.current,
      upstream: false
    });
  }
  for (const rb of remoteBranches ?? []) {
    if (rb.sha !== sha) continue;
    badges.push({
      kind: 'remoteBranch',
      name: rb.name,
      prefix: `${rb.remote}/`,
      label: rb.shortName,
      head: false,
      upstream: upstream !== null && rb.name === upstream
    });
  }
  return badges.sort(compareBadges);
}

/**
 * Middle-truncate: keep the head (which carries `feat/`, `fix/`,
 * `dependabot/`) and a fixed tail (which carries the distinguishing part).
 * Pure CSS — the head span ellipsises, the tail span never shrinks — so no
 * measurement pass and no dependence on the rendered font.
 */
function splitMiddle(label: string): { start: string; end: string } {
  if (label.length <= TRUNCATE_OVER) return { start: label, end: '' };
  const tail = Math.min(TAIL_CHARS, Math.floor(label.length / 3));
  return {
    start: label.slice(0, label.length - tail),
    end: label.slice(label.length - tail)
  };
}

const GLYPH: Record<RefBadgeKind, string> = {
  localBranch: 'git-branch',
  remoteBranch: 'cloud',
  tag: 'tag',
  detachedHead: 'git-commit'
};

function pillClass(b: RefBadge): string {
  const kind =
    b.kind === 'remoteBranch'
      ? 'scm-ref-remote'
      : b.kind === 'tag'
        ? 'scm-ref-tag'
        : 'scm-ref-local';
  // `scm-ref-head` / `scm-ref-upstream` are not only styling: they are the
  // two pills that must stay READABLE when the row runs out of width, since
  // together they are the divergence sentence (§4.3). scm.css floors them.
  return [
    'scm-ref-pill',
    kind,
    b.head ? 'scm-ref-head' : '',
    b.upstream ? 'scm-ref-upstream' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function RefPill({
  badge,
  title,
  full
}: {
  badge: RefBadge;
  title: string;
  /** Card context: the name is whole, so no middle split and no width cap. */
  full: boolean;
}): React.JSX.Element {
  const { start, end } = full
    ? { start: badge.label, end: '' }
    : splitMiddle(badge.label);
  return (
    <span className={pillClass(badge)} title={title}>
      <Codicon name={GLYPH[badge.kind]} size={10} />
      <span className="scm-ref-name">
        {badge.prefix !== '' ? (
          <span className="scm-ref-prefix">{badge.prefix}</span>
        ) : null}
        <span className="scm-ref-start">{start}</span>
        {end !== '' ? <span className="scm-ref-end">{end}</span> : null}
      </span>
    </span>
  );
}

/**
 * The pill row. `lastFetchedAt` is not decoration: a remote pill asserts
 * where the remote WAS at the last fetch, so its tooltip says when that was
 * (research 24 §6.3).
 */
export function RefPills({
  badges,
  lastFetchedAt,
  now,
  full = false
}: {
  badges: readonly RefBadge[];
  lastFetchedAt: number | null;
  now: number;
  /**
   * Hover-card mode (§4.5): every ref, whole names, wrapping — this is where
   * the row's "+n" resolves. Rows stay capped so the message column survives.
   */
  full?: boolean;
}): React.JSX.Element | null {
  if (badges.length === 0) return null;
  const limit = full ? badges.length : MAX_REF_PILLS;
  const shown = badges.slice(0, limit);
  const rest = badges.slice(limit);
  return (
    <span className={full ? 'scm-refs scm-refs-full' : 'scm-refs'}>
      {shown.map((b) => (
        <RefPill
          key={`${b.kind}-${b.name}`}
          badge={b}
          full={full}
          title={
            b.kind === 'remoteBranch'
              ? remoteRefTitle(b.name, lastFetchedAt, now)
              : b.kind === 'tag'
                ? `${b.name} — tag`
                : b.kind === 'detachedHead'
                  ? 'HEAD is detached at this commit'
                  : b.head
                    ? `${b.name} — the branch you are on`
                    : `${b.name} — local branch`
          }
        />
      ))}
      {rest.length > 0 ? (
        <span
          className="scm-ref-pill scm-ref-more num"
          // A hover card resolves the full list properly (§4.5); this keeps
          // the pointer-only path working for the overflow itself.
          title={rest.map((b) => b.name).join('\n')}
        >
          +{rest.length}
        </span>
      ) : null}
    </span>
  );
}

/** "on main, origin/main" — the refs clause of a row's accessible name. */
export function refsAriaClause(badges: readonly RefBadge[]): string {
  if (badges.length === 0) return '';
  return `, on ${badges.map((b) => b.name).join(', ')}`;
}
