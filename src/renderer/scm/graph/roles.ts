/**
 * Which commits claim a fixed lane colour (Phase 14.5, research 24 §5.4/§7.4).
 *
 * The three role colours ARE ask #1. Without them the lane carrying your
 * branch and the lane carrying `origin/<branch>` are two arbitrary rotation
 * hues, and "am I ahead or behind?" has to be read off the badges instead of
 * off the picture.
 *
 * Kept SHA-based rather than ref-based on purpose: the divergence snapshot the
 * data layer already returns (`GitDivergenceInfo`) carries `headSha`,
 * `upstreamSha` and `mergeBase`, so the colouring cannot disagree with the
 * ahead/behind numbers printed next to it — they come from the same call.
 */

import type { LaneRole, RoleResolver } from './types';

/**
 * The three anchor commits. Structurally satisfied by `GitDivergenceInfo`, so
 * the IPC payload can be passed straight in; declared locally so the layout
 * module keeps its zero-dependency, unit-testable surface.
 */
export interface RoleAnchors {
  /** HEAD's tip. */
  readonly headSha?: string | null;
  /** The upstream's tip. */
  readonly upstreamSha?: string | null;
  /** `git merge-base HEAD @{u}`. */
  readonly mergeBase?: string | null;
}

/**
 * Build the resolver `layoutGraph` calls once per row.
 *
 * Precedence is local → remote → base, which matters in the two degenerate
 * cases. When you are exactly up to date all three SHAs are equal and the row
 * reads as YOUR branch, not as a merge base — there is no divergence to
 * describe. When you are only ahead, the upstream tip IS the merge base and it
 * reads as the remote, because that is the lane the user is asking about.
 *
 * A role RE-colours the lane from that row down, which is deliberate at the
 * merge base: below it the history is shared, and painting it "yours" would
 * claim ownership of commits `origin` also has.
 *
 * Returns `undefined` when there is nothing to anchor (no upstream, detached,
 * unborn) so the caller can skip the per-row call entirely.
 */
export function makeRoleResolver(
  anchors: RoleAnchors | null | undefined
): RoleResolver | undefined {
  const head = nonEmpty(anchors?.headSha);
  const upstream = nonEmpty(anchors?.upstreamSha);
  const base = nonEmpty(anchors?.mergeBase);
  if (head === undefined && upstream === undefined && base === undefined) {
    return undefined;
  }
  return (hash: string): LaneRole | undefined => {
    if (hash === head) return 'local';
    if (hash === upstream) return 'remote';
    if (hash === base) return 'base';
    return undefined;
  };
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value === null || value === undefined || value.length === 0
    ? undefined
    : value;
}
