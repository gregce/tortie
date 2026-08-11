import { describe, expect, it } from 'vitest';
import { DEFAULT_LANE_CAP, capRow, gutterColumns } from '../cap';
import { layoutGraph } from '../layout';
import { makeRoleResolver } from '../roles';
import type { GraphRow } from '../types';
import {
  GETSPECSTORY_HEAD,
  GETSPECSTORY_MERGE_BASE,
  GETSPECSTORY_TANGLE,
  GETSPECSTORY_UPSTREAM
} from './fixtures/getspecstory';
import { OCTOPUS_REPO } from './fixtures/tangle';

const layout = layoutGraph(GETSPECSTORY_TANGLE, {
  roleOf: makeRoleResolver({
    headSha: GETSPECSTORY_HEAD,
    upstreamSha: GETSPECSTORY_UPSTREAM,
    mergeBase: GETSPECSTORY_MERGE_BASE
  })
});

describe('capRow', () => {
  it('leaves a row that already fits completely alone', () => {
    const narrow = layoutGraph(OCTOPUS_REPO);
    for (const row of narrow.rows) {
      const capped = capRow(row, DEFAULT_LANE_CAP);
      // Referential identity, so the renderer can memoise on it.
      expect(capped.in).toBe(row.in);
      expect(capped.out).toBe(row.out);
      expect(capped.mergeTargets).toBe(row.mergeTargets);
      expect(capped.circle).toBe(row.circle);
      expect(capped.bundleColumn).toBe(-1);
    }
  });

  it('folds the overflow into one marker column', () => {
    const wide = layout.rows.find((row) => row.out.length > 8);
    expect(wide).toBeDefined();
    const capped = capRow(wide as GraphRow, 6);
    // Five real columns survive; the sixth is the marker.
    expect(capped.out).toHaveLength(5);
    expect(capped.bundleColumn).toBe(5);
    expect(capped.bundledOut).toBe((wide as GraphRow).out.length - 5);
    expect(capped.out).toEqual((wide as GraphRow).out.slice(0, 5));
  });

  it('never drops the dot — a row without one is unreadable', () => {
    let clamped = 0;
    for (const row of layout.rows) {
      const capped = capRow(row, 6);
      expect(capped.circle).toBeLessThan(6);
      expect(capped.circle).toBeGreaterThanOrEqual(0);
      if (row.circle >= 6) {
        // Drawn ON the marker rather than off the edge.
        expect(capped.circle).toBe(capped.bundleColumn);
        clamped++;
      }
    }
    // The fixture really does exercise the clamp.
    expect(clamped).toBeGreaterThan(0);
  });

  it('clamps and dedupes merge targets onto surviving columns', () => {
    const octopusPastCap = layout.rows.find(
      (row) =>
        row.mergeTargets.length > 0 &&
        row.mergeTargets.some((target) => target >= 6)
    );
    expect(octopusPastCap).toBeDefined();
    const capped = capRow(octopusPastCap as GraphRow, 6);
    for (const target of capped.mergeTargets) {
      expect(target).toBeLessThanOrEqual(5);
    }
    expect(new Set(capped.mergeTargets).size).toBe(capped.mergeTargets.length);
  });

  it('is a rendering pass only — uncapping is a re-render, not a relayout', () => {
    // Same layout, two caps: the underlying rows are untouched, so widening
    // the pane cannot reshuffle a lane.
    const six = layout.rows.map((row) => capRow(row, 6));
    const eight = layout.rows.map((row) => capRow(row, 8));
    layout.rows.forEach((row, i) => {
      expect(six[i]?.out).toEqual(row.out.slice(0, six[i]?.out.length));
      expect(eight[i]?.out.slice(0, 5)).toEqual(row.out.slice(0, 5));
    });
  });

  it('refuses a degenerate cap rather than producing a negative column', () => {
    const wide = layout.rows.find((row) => row.out.length > 8) as GraphRow;
    const capped = capRow(wide, 0);
    expect(capped.bundleColumn).toBe(1);
    expect(capped.out).toHaveLength(1);
    expect(capped.circle).toBeGreaterThanOrEqual(0);
  });
});

describe('gutterColumns', () => {
  it('is a function of the CAP, not of the current page', () => {
    // If the gutter tracked the current maximum, every "load 50 more" would
    // reflow the subject column and the whole list would jump under the cursor.
    const page1 = layoutGraph(GETSPECSTORY_TANGLE.slice(0, 50));
    const page2 = layoutGraph(GETSPECSTORY_TANGLE.slice(0, 400));
    expect(page1.maxLanes).not.toBe(page2.maxLanes);
    expect(gutterColumns(page1, 4)).toBe(gutterColumns(page2, 4));
  });

  it('does not make a narrow repo pay for lanes it never uses', () => {
    const linear = layoutGraph([
      { hash: 'A', parents: ['B'] },
      { hash: 'B', parents: [] }
    ]);
    expect(gutterColumns(linear, 6)).toBe(1);
  });
});
