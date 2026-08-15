/**
 * Phase 47 item 2. The decision that keeps the name filter alive when you
 * click a result, and puts it away when you meant to put it away.
 */

import { describe, expect, it } from 'vitest';
import {
  FILTER_STASH_MS,
  filterReopenValue,
  folderExpansionAfterReopen
} from '../filter-guard';
import type { FilterStash } from '../filter-guard';

const NOW = 1_000_000;

function clickStash(overrides: Partial<FilterStash> = {}): FilterStash {
  return {
    value: 'app',
    at: NOW - 5,
    row: { path: 'src/app.tsx', kind: 'file', wasExpanded: false },
    ...overrides
  };
}

function closeInput(overrides: Record<string, unknown> = {}): {
  wasOpen: boolean;
  isOpen: boolean;
  sanctionedUntil: number;
  stash: FilterStash | null;
  now: number;
} {
  return {
    wasOpen: true,
    isOpen: false,
    sanctionedUntil: 0,
    stash: clickStash(),
    now: NOW,
    ...overrides
  };
}

describe('filterReopenValue', () => {
  it('reopens with the same text after a row click closed it', () => {
    expect(filterReopenValue(closeInput())).toBe('app');
  });

  it('reopens after Enter, which has no row behind it', () => {
    expect(
      filterReopenValue(closeInput({ stash: clickStash({ row: null }) }))
    ).toBe('app');
  });

  it('leaves a sanctioned close alone (Escape, the toggle, the clear button)', () => {
    expect(filterReopenValue(closeInput({ sanctionedUntil: NOW + 100 }))).toBe(
      null
    );
  });

  it('leaves a close with no gesture behind it alone', () => {
    expect(filterReopenValue(closeInput({ stash: null }))).toBe(null);
  });

  it('leaves a stale gesture alone', () => {
    expect(
      filterReopenValue(
        closeInput({ stash: clickStash({ at: NOW - FILTER_STASH_MS - 1 }) })
      )
    ).toBe(null);
  });

  it('does not reopen an empty filter', () => {
    expect(
      filterReopenValue(closeInput({ stash: clickStash({ value: '' }) }))
    ).toBe(null);
  });

  it('does nothing when the filter was not open, or is still open', () => {
    expect(filterReopenValue(closeInput({ wasOpen: false }))).toBe(null);
    expect(filterReopenValue(closeInput({ isOpen: true }))).toBe(null);
  });

  it('treats an expired sanction as no sanction', () => {
    expect(filterReopenValue(closeInput({ sanctionedUntil: NOW - 1 }))).toBe(
      'app'
    );
  });
});

describe('folderExpansionAfterReopen', () => {
  it('opens a folder that was closed when it was clicked', () => {
    const stash = clickStash({
      row: { path: 'src/', kind: 'folder', wasExpanded: false }
    });
    expect(folderExpansionAfterReopen(stash)).toEqual({
      path: 'src/',
      expand: true
    });
  });

  it('closes a folder that was open when it was clicked', () => {
    const stash = clickStash({
      row: { path: 'src/', kind: 'folder', wasExpanded: true }
    });
    expect(folderExpansionAfterReopen(stash)).toEqual({
      path: 'src/',
      expand: false
    });
  });

  it('has nothing to do for a file click or for Enter', () => {
    expect(folderExpansionAfterReopen(clickStash())).toBe(null);
    expect(folderExpansionAfterReopen(clickStash({ row: null }))).toBe(null);
    expect(folderExpansionAfterReopen(null)).toBe(null);
  });
});
