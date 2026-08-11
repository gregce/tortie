/**
 * Lane stability — "lanes must not reshuffle under the user's eyes as they
 * scroll" (BACKLOG Phase 14.5).
 *
 * This is the promise the whole swimlane choice was made for, so it is
 * asserted directly rather than argued from the shape of the code. Two
 * perturbations, both of which happen constantly in an agentic session:
 *
 *  - **A page loads.** gmux grows `maxCount` and refetches the window, so
 *    every row is laid out again. Rows already on screen must come out
 *    identical.
 *  - **A commit lands at HEAD.** An agent commits while the pane is open, and
 *    every existing row shifts down by one. The lanes must shift with them,
 *    not re-thread.
 *
 * Both hold because the fold is a LEFT fold with no lookahead: row *n* is a
 * pure function of commits `0..n`. Nothing below a row is an input to it.
 */

import { describe, expect, it } from 'vitest';
import { layoutGraph } from '../layout';
import { makeRoleResolver } from '../roles';
import type { GraphCommit, GraphRow } from '../types';
import {
  GETSPECSTORY_HEAD,
  GETSPECSTORY_MERGE_BASE,
  GETSPECSTORY_TANGLE,
  GETSPECSTORY_UPSTREAM
} from './fixtures/getspecstory';
import {
  OCTOPUS_BASE,
  OCTOPUS_HEAD,
  OCTOPUS_REPO,
  OCTOPUS_UPSTREAM
} from './fixtures/tangle';

const commits: readonly GraphCommit[] = GETSPECSTORY_TANGLE;
const roleOf = makeRoleResolver({
  headSha: GETSPECSTORY_HEAD,
  upstreamSha: GETSPECSTORY_UPSTREAM,
  mergeBase: GETSPECSTORY_MERGE_BASE
});

/**
 * Everything a user can SEE about a row's lanes.
 *
 * Two fields are deliberately excluded, and the exclusions are the honest part
 * of this test:
 *
 *  - **`in`** is by definition the previous row's `out` (asserted by reference
 *    in `invariants.ts`), so comparing it here would double-count — and at the
 *    TOP of a window it is empty by construction, so a prepended commit
 *    legitimately changes it on row 0 alone.
 *  - **`openEnded`** describes the WINDOW, not the lane assignment. Loading a
 *    page can only turn it off — a promise that had no visible commit now has
 *    one — which is a stroke gaining an endpoint, not a lane moving. It gets
 *    its own monotonicity assertion below.
 */
function visible(row: GraphRow): unknown {
  return {
    hash: row.hash,
    circle: row.circle,
    color: row.color,
    mergeTargets: row.mergeTargets,
    out: row.out
  };
}

/** Just the columns — the weaker promise, used where colour may legitimately move. */
function columns(row: GraphRow): unknown {
  return {
    hash: row.hash,
    circle: row.circle,
    mergeTargets: row.mergeTargets,
    out: row.out.map((lane) => lane.sha)
  };
}

describe('paging — layout(first N) must agree with layout(first M) on the first N rows', () => {
  it('200 then 400, on a real 400-commit merge tangle: 0 rows changed', () => {
    const page1 = layoutGraph(commits.slice(0, 200), { roleOf });
    const page2 = layoutGraph(commits.slice(0, 400), { roleOf });

    expect(page1.rows).toHaveLength(200);
    const changed = page1.rows.filter(
      (row, i) =>
        JSON.stringify(visible(row)) !==
        JSON.stringify(visible(page2.rows[i] as GraphRow))
    );
    expect(changed.map((row) => row.hash)).toEqual([]);
  });

  it('holds at every page boundary a 50-commit page size would produce', () => {
    const full = layoutGraph(commits, { roleOf });
    for (let size = 50; size < 400; size += 50) {
      const page = layoutGraph(commits.slice(0, size), { roleOf });
      for (let i = 0; i < size; i++) {
        expect(visible(page.rows[i] as GraphRow), `page ${size}, row ${i}`).toEqual(
          visible(full.rows[i] as GraphRow)
        );
      }
    }
  });

  it('a growing window only ever RESOLVES open lanes, never reopens them', () => {
    const page1 = layoutGraph(commits.slice(0, 200), { roleOf });
    const page2 = layoutGraph(commits.slice(0, 400), { roleOf });
    for (let i = 0; i < 200; i++) {
      const before = page1.rows[i]?.openEnded ?? false;
      const after = page2.rows[i]?.openEnded ?? false;
      if (!before) expect(after, `row ${i} reopened`).toBe(false);
    }
    // And it does actually resolve some — otherwise this asserts nothing.
    const resolved = page1.rows.filter(
      (row, i) => row.openEnded && page2.rows[i]?.openEnded === false
    );
    expect(resolved.length).toBeGreaterThan(0);
  });

  it('a page is not silently identical — the second page really adds lanes', () => {
    const page1 = layoutGraph(commits.slice(0, 200), { roleOf });
    const page2 = layoutGraph(commits.slice(0, 400), { roleOf });
    expect(page2.maxLanes).toBeGreaterThan(page1.maxLanes);
    expect(page2.rows.length).toBe(400);
  });
});

describe('a commit landing at HEAD', () => {
  it('shifts every row down without re-threading a single lane', () => {
    // The realistic case: an agent commits on the current branch, so the new
    // commit is HEAD and the old HEAD is now an ordinary ancestor.
    const before = layoutGraph(OCTOPUS_REPO, {
      roleOf: makeRoleResolver({
        headSha: OCTOPUS_HEAD,
        upstreamSha: OCTOPUS_UPSTREAM,
        mergeBase: OCTOPUS_BASE
      })
    });
    const after = layoutGraph(
      [{ hash: 'NEW', parents: [OCTOPUS_HEAD] }, ...OCTOPUS_REPO],
      {
        roleOf: makeRoleResolver({
          headSha: 'NEW',
          upstreamSha: OCTOPUS_UPSTREAM,
          mergeBase: OCTOPUS_BASE
        })
      }
    );

    expect(after.rows).toHaveLength(before.rows.length + 1);
    expect(after.rows[0]?.circle).toBe(0);
    for (let i = 0; i < before.rows.length; i++) {
      expect(
        visible(after.rows[i + 1] as GraphRow),
        `row ${i} re-threaded`
      ).toEqual(visible(before.rows[i] as GraphRow));
    }
  });

  it('keeps every COLUMN even when the new tip changes which lanes are roled', () => {
    // The weaker, more general case: an incoming commit arrives on the
    // upstream, so row 0 is a new commit the previous window had never seen.
    // Colour can legitimately move here — the lane below inherits from a
    // different row, and a role anchor may have moved with it — but no lane may
    // change COLUMN, which is what the eye actually tracks while scrolling.
    const after = layoutGraph(commits, { roleOf });
    const before = layoutGraph(commits.slice(1), { roleOf });
    for (let i = 0; i < before.rows.length; i++) {
      expect(
        columns(after.rows[i + 1] as GraphRow),
        `row ${i} changed column`
      ).toEqual(columns(before.rows[i] as GraphRow));
    }
  });
});

describe('what would break stability (documented contracts, asserted)', () => {
  it('is a pure function — same input, byte-identical output', () => {
    const a = layoutGraph(commits, { roleOf });
    const b = layoutGraph(commits, { roleOf });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('CHANGES when the ref set changes — which is why scope must be pinned', () => {
    // Dropping a tip from the walk is a different graph, not a longer one. The
    // data layer therefore echoes the resolved refnames back and the renderer
    // feeds them to the next page verbatim; re-resolving scope per page would
    // reshuffle the pane the moment an agent's `git fetch` landed mid-scroll.
    const withUpstream = layoutGraph(commits, { roleOf });
    const withoutUpstreamTip = layoutGraph(commits.slice(1), { roleOf });
    expect(withoutUpstreamTip.rows[0]?.hash).not.toBe(
      withUpstream.rows[0]?.hash
    );
  });
});
