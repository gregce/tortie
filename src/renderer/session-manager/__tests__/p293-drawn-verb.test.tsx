/**
 * Phase 293, the integrator's seam between the grid and ./actions.ts.
 *
 * The visible button can change verb under a finger: a row that ends by
 * itself flips `End session…` to `Restore` in place. `runPrimary` takes the
 * verb the button was DRAWN with, and asks that verb's own gate over the fresh
 * row, so a press meant for End never restores (SPEC 4.0). That only holds if
 * the button hands its drawn verb over. The builders' tests held each half on
 * its own; this holds the join: the click passes `row.primary.verb`.
 *
 * The environment is node, so the component is called as a function with its
 * two hooks stood in, and its element's `onClick` is pressed directly.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ManageRow } from '../projection';

const { runPrimary } = vi.hoisted(() => ({ runPrimary: vi.fn() }));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useRef: <T,>(value: T) => ({ current: value }),
    useLayoutEffect: () => undefined
  };
});
vi.mock('../actions', () => ({
  runPrimary,
  openDetails: vi.fn(),
  openRowMenu: vi.fn()
}));
vi.mock('../InlinePanel', () => ({ InlinePanel: () => null }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});

const { PrimaryButton } = await import('../ManagedGrid');

function row(tab: ManageRow['tab'], primary: ManageRow['primary']): ManageRow {
  // Only what the button reads. Everything else is the projection's business.
  return { id: 'row-1', tab, primary } as unknown as ManageRow;
}

function press(r: ManageRow): void {
  const element = PrimaryButton({ row: r, inert: false }) as unknown as {
    props: { onClick: () => void };
  };
  element.props.onClick();
}

describe('the visible button hands runPrimary the verb it was drawn with', () => {
  it('End session…, on a live Managed row', () => {
    runPrimary.mockClear();
    press(row('managed', { verb: 'end', enabled: true, title: null }));
    expect(runPrimary).toHaveBeenCalledTimes(1);
    expect(runPrimary).toHaveBeenCalledWith('row-1', 'managed', 'end');
  });

  it('Restore, on an ended Managed row', () => {
    runPrimary.mockClear();
    press(row('managed', { verb: 'restore', enabled: true, title: null, busy: false }));
    expect(runPrimary).toHaveBeenCalledWith('row-1', 'managed', 'restore');
  });

  it('Restore, on a Past row', () => {
    runPrimary.mockClear();
    press(row('past', { verb: 'restore', enabled: true, title: null, busy: false }));
    expect(runPrimary).toHaveBeenCalledWith('row-1', 'past', 'restore');
  });
});
