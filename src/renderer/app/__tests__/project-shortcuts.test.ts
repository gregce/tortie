import { describe, expect, it } from 'vitest';
import {
  digitToIndex,
  tabDigit,
  tabShortcutLabel
} from '../project-shortcuts';

describe('digitToIndex — what ⌘<digit> selects', () => {
  it('maps ⌘1…⌘8 to positions', () => {
    expect(digitToIndex(1, 5)).toBe(0);
    expect(digitToIndex(5, 5)).toBe(4);
    expect(digitToIndex(8, 12)).toBe(7);
  });

  it('sends ⌘9 to the LAST project, not the ninth', () => {
    expect(digitToIndex(9, 12)).toBe(11);
    expect(digitToIndex(9, 40)).toBe(39);
    // Exactly nine: last and ninth are the same tab.
    expect(digitToIndex(9, 9)).toBe(8);
    // Fewer than nine: still the last one, never a dead key.
    expect(digitToIndex(9, 3)).toBe(2);
    expect(digitToIndex(9, 1)).toBe(0);
  });

  it('refuses digits that address nothing', () => {
    expect(digitToIndex(5, 3)).toBeNull();
    expect(digitToIndex(1, 0)).toBeNull();
    expect(digitToIndex(9, 0)).toBeNull();
    expect(digitToIndex(0, 5)).toBeNull();
  });
});

describe('tabDigit — what a tab reveals while ⌘ is held', () => {
  it('numbers the first eight tabs by position', () => {
    expect(tabDigit(0, 12)).toBe(1);
    expect(tabDigit(7, 12)).toBe(8);
  });

  it('leaves the unreachable middle of a long strip blank', () => {
    expect(tabDigit(8, 12)).toBeNull();
    expect(tabDigit(10, 12)).toBeNull();
  });

  it('gives the last tab 9 only when 9 is not already its position', () => {
    expect(tabDigit(11, 12)).toBe(9);
    expect(tabDigit(8, 9)).toBe(9);
    // Five projects: the fifth tab is "5", not "5" and "9".
    expect(tabDigit(4, 5)).toBe(5);
    expect(tabDigit(0, 1)).toBe(1);
  });

  it('has nothing to say about a tab that does not exist', () => {
    expect(tabDigit(-1, 3)).toBeNull();
    expect(tabDigit(3, 3)).toBeNull();
  });
});

describe('the hint and the keystroke agree', () => {
  it('round-trips every advertised digit back to its own tab', () => {
    for (const count of [1, 2, 5, 8, 9, 10, 12, 30]) {
      for (let i = 0; i < count; i++) {
        const digit = tabDigit(i, count);
        if (digit === null) continue;
        expect(digitToIndex(digit, count)).toBe(i);
      }
    }
  });

  it('never advertises the same digit on two tabs', () => {
    for (const count of [1, 5, 9, 10, 30]) {
      const shown = new Set<number>();
      for (let i = 0; i < count; i++) {
        const digit = tabDigit(i, count);
        if (digit === null) continue;
        expect(shown.has(digit)).toBe(false);
        shown.add(digit);
      }
    }
  });
});

describe('tabShortcutLabel', () => {
  it('names the ⌘9 convention where the tooltip has room to', () => {
    expect(tabShortcutLabel(3)).toBe('⌘3');
    expect(tabShortcutLabel(9)).toBe('⌘9 — last project');
  });
});
