/**
 * Structural invariants every layout must satisfy, whatever the DAG.
 *
 * These are the assertions worth running against a REAL repository, because a
 * 400-commit tangle has shapes nobody thinks to hand-write, and "it looked
 * right in the screenshot" is not evidence. Each one is a property, not an
 * example, so it holds for any window of any repo.
 */

import { expect } from 'vitest';
import type { GraphCommit, GraphLayout } from '../types';
import { sameColor } from '../colors';

export function assertGraphInvariants(
  commits: readonly GraphCommit[],
  layout: GraphLayout
): void {
  const { rows } = layout;

  // Rows are 1:1 with commits, in order. A dropped or reordered row would
  // make every other assertion vacuous.
  expect(rows).toHaveLength(commits.length);

  const indexOf = new Map<string, number>();
  commits.forEach((commit, i) => indexOf.set(commit.hash, i));

  let previousOut: GraphLayout['rows'][number]['out'] | undefined;
  let widest = 0;

  rows.forEach((row, i) => {
    const commit = commits[i];
    if (commit === undefined) throw new Error('fixture/rows length mismatch');
    const where = `row ${i} (${commit.hash})`;

    expect(row.index, where).toBe(i);
    expect(row.hash, where).toBe(commit.hash);

    // 1. The fold's state IS the previous row's output — not a copy of it.
    //    Reference equality is what lets the renderer memoise a row on `in`.
    if (previousOut === undefined) expect(row.in, where).toHaveLength(0);
    else expect(row.in, where).toBe(previousOut);

    // 2. The dot sits where the commit was AWAITED — at the first such column,
    //    so a straight run of commits stays in one column — or one past the
    //    right edge when nothing awaited it (a branch tip entering the window).
    const awaited = row.in.findIndex((lane) => lane.sha === commit.hash);
    expect(row.circle, `${where}: circle`).toBe(
      awaited === -1 ? row.in.length : awaited
    );

    // 3. Every lane that was awaiting this commit is consumed here. A leftover
    //    would draw a line straight through the dot it was waiting for.
    expect(
      row.out.filter((lane) => lane.sha === commit.hash).length,
      `${where}: lanes still awaiting the drawn commit`
    ).toBe(commit.parents.includes(commit.hash) ? 1 : 0);

    // 4. EDGE FIDELITY — the drawn edges are exactly the DAG's edges.
    //    The first parent is promised by the lane at the dot's own column;
    //    every later parent by the column `mergeTargets` names, in order.
    if (commit.parents.length > 0) {
      expect(row.out[row.circle]?.sha, `${where}: first-parent lane`).toBe(
        commit.parents[0]
      );
    }
    expect(row.mergeTargets, `${where}: mergeTargets length`).toHaveLength(
      Math.max(0, commit.parents.length - 1)
    );
    row.mergeTargets.forEach((target, p) => {
      expect(row.out[target]?.sha, `${where}: parent ${p + 1} lane`).toBe(
        commit.parents[p + 1]
      );
    });

    // 5. A root closes its own lane rather than wiping the row (the defect in
    //    the VS Code reference). Everything the row did not consume survives.
    if (commit.parents.length === 0) {
      const survivors = row.in.filter((lane) => lane.sha !== commit.hash);
      expect(row.out, `${where}: root must not wipe live lanes`).toHaveLength(
        survivors.length
      );
    }

    // 6. No lane ever points BACKWARDS. In topological order a parent never
    //    precedes its children, so a promise must resolve strictly below the
    //    row that made it — or fall outside the window entirely.
    for (const lane of row.out) {
      const at = indexOf.get(lane.sha);
      if (at !== undefined) {
        expect(at, `${where}: lane ${lane.sha} promised upwards`).toBeGreaterThan(i);
      }
    }

    // 7. `openEnded` says exactly one thing: some promise cannot be kept
    //    inside this window, so its stroke must fade rather than stop dead.
    const anyUnloaded = row.out.some((lane) => !indexOf.has(lane.sha));
    expect(row.openEnded, `${where}: openEnded`).toBe(anyUnloaded);

    expect(row.isMerge, where).toBe(commit.parents.length > 1);
    expect(row.isRoot, where).toBe(commit.parents.length === 0);

    // 8. The dot wears the colour of the lane it continues into.
    if (commit.parents.length > 0) {
      const continuation = row.out[row.circle];
      expect(continuation, where).toBeDefined();
      if (continuation !== undefined) {
        expect(
          sameColor(row.color, continuation.color),
          `${where}: dot colour must match its lane`
        ).toBe(true);
      }
    }

    widest = Math.max(widest, row.in.length, row.out.length, row.circle + 1);
    previousOut = row.out;
  });

  expect(layout.maxLanes).toBe(widest);
  expect(layout.tailLanes).toBe(previousOut ?? layout.tailLanes);
  if (rows.length === 0) expect(layout.tailLanes).toHaveLength(0);
}

/**
 * A one-line-per-row picture of a layout, in the shape research 24 §4.4 used
 * to check the algorithm against `git log --graph`. Golden strings written in
 * this form are readable in a diff, which matters when a lane assertion fails.
 */
export function renderAscii(
  layout: GraphLayout,
  labels?: (row: GraphLayout['rows'][number]) => string
): string[] {
  const width = layout.maxLanes;
  return layout.rows.map((row) => {
    const cells: string[] = [];
    for (let col = 0; col < width; col++) {
      if (col === row.circle) {
        cells.push(row.isRoot ? '◎' : row.isMerge ? '◍' : '●');
      } else if (col < row.in.length || col < row.out.length) {
        cells.push('│');
      } else {
        cells.push(' ');
      }
    }
    const label = labels?.(row) ?? row.hash;
    return `${cells.join(' ')}  ${label}`.trimEnd();
  });
}
