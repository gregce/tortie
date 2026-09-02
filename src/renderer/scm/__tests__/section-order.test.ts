/**
 * Phase 198. Where a section a stored order has never heard of lands.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeOrder } from '../sections';

const DEFAULTS = ['changes', 'history', 'fileHistory', 'branches', 'runs', 'promises'];

describe('sanitizeOrder', () => {
  it('keeps a complete stored order as it is', () => {
    const stored = ['branches', 'changes', 'promises', 'history', 'fileHistory', 'runs'];
    expect(sanitizeOrder(stored, DEFAULTS)).toEqual(stored);
  });

  it('lands a missing id directly after its default predecessor', () => {
    // The operator's own stored order predates the section. It must arrive
    // under History, not under Promises.
    expect(
      sanitizeOrder(['changes', 'history', 'branches', 'runs', 'promises'], DEFAULTS)
    ).toEqual(['changes', 'history', 'fileHistory', 'branches', 'runs', 'promises']);
  });

  it('follows the predecessor wherever the person moved it', () => {
    expect(
      sanitizeOrder(['branches', 'history', 'changes', 'runs', 'promises'], DEFAULTS)
    ).toEqual(['branches', 'history', 'fileHistory', 'changes', 'runs', 'promises']);
  });

  it('places every missing id after its own nearest present predecessor', () => {
    // History follows Changes, File history follows History, and Runs and
    // Promises follow Branches, which is where the stored order put it.
    expect(sanitizeOrder(['branches', 'changes'], DEFAULTS)).toEqual([
      'branches',
      'runs',
      'promises',
      'changes',
      'history',
      'fileHistory'
    ]);
  });

  it('puts a missing first id first and drops unknown ids', () => {
    expect(sanitizeOrder(['nope', 'history'], DEFAULTS)).toEqual([
      'changes',
      'history',
      'fileHistory',
      'branches',
      'runs',
      'promises'
    ]);
  });

  it('answers the defaults for no stored order', () => {
    expect(sanitizeOrder(null, DEFAULTS)).toEqual(DEFAULTS);
  });
});
