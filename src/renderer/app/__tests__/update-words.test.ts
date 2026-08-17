/**
 * The shared update stage words (Phase 62.1).
 *
 * What these tests hold:
 * - The home words per stage, pinned as literals.
 * - The ring's hover, recomposed from the shared words plus its click
 *   suffix, is BYTE IDENTICAL to the Phase 58 hover strings for every
 *   stage. Nothing the operator sees on the ring moved.
 * - The ready words carry the exact fragment build/assert-bundle-refusals.mjs
 *   pins against the renderer bundle.
 */

import { describe, expect, it } from 'vitest';
import type { UpdateUiState } from '@shared/ipc';
import { ringHover } from '../UpdateRing';
import { updateStageWords } from '../update-words';
import type { UpdateRingSnapshot } from '../update-words';

/** A full snapshot with quiet defaults, overridden per case. */
function snap(over: Partial<UpdateRingSnapshot>): UpdateRingSnapshot {
  return {
    ring: 'hidden',
    ringVersion: null,
    ringPercent: null,
    failedDuring: null,
    ...over
  };
}

/**
 * Every stage the four fields can express, next to the exact home words and
 * the exact Phase 58 hover string. The hover strings below are copied from
 * the Phase 58 test expectations, not derived, so a drift in either module
 * fails against a literal.
 */
const TABLE: {
  name: string;
  state: UpdateRingSnapshot;
  words: string;
  hover: string;
}[] = [
  {
    name: 'hidden',
    state: snap({}),
    words: '',
    hover: ''
  },
  {
    name: 'checking',
    state: snap({ ring: 'checking' }),
    words: 'Checking for updates',
    hover: 'Checking for updates'
  },
  {
    name: 'downloading',
    state: snap({ ring: 'downloading', ringVersion: '0.26.0', ringPercent: 40 }),
    words: 'Downloading 0.26.0, 40 percent',
    hover: 'Downloading 0.26.0, 40 percent'
  },
  {
    name: 'staging',
    state: snap({ ring: 'staging', ringVersion: '0.26.0' }),
    words: 'Preparing 0.26.0',
    hover: 'Preparing 0.26.0'
  },
  {
    name: 'ready',
    state: snap({ ring: 'ready', ringVersion: '0.26.0' }),
    words: 'Tortie 0.26.0 is ready. It installs when you quit.',
    hover:
      'Tortie 0.26.0 is ready. It installs when you quit. Click to choose when.'
  },
  {
    name: 'failed during checking',
    state: snap({ ring: 'failed', failedDuring: 'checking' }),
    words: 'The update check failed.',
    hover: 'The update check failed. Click to see why.'
  },
  {
    name: 'failed during downloading',
    state: snap({
      ring: 'failed',
      ringVersion: '0.26.0',
      failedDuring: 'downloading'
    }),
    words: 'The download of 0.26.0 did not finish.',
    hover: 'The download of 0.26.0 did not finish. Click to see why.'
  },
  {
    name: 'failed during staging',
    state: snap({
      ring: 'failed',
      ringVersion: '0.26.0',
      failedDuring: 'staging'
    }),
    words: 'Tortie could not prepare 0.26.0.',
    hover: 'Tortie could not prepare 0.26.0. Click to see why.'
  },
  {
    name: 'failed with the stage unknown',
    state: snap({ ring: 'failed' }),
    words: 'The update did not finish.',
    hover: 'The update did not finish. Click to see why.'
  }
];

describe('the home words per stage', () => {
  for (const row of TABLE) {
    it(`${row.name} reads "${row.words}"`, () => {
      expect(updateStageWords(row.state)).toBe(row.words);
    });
  }

  it('the downloading percent is floored, never rounded up', () => {
    expect(
      updateStageWords(
        snap({ ring: 'downloading', ringVersion: '0.26.0', ringPercent: 99.9 })
      )
    ).toBe('Downloading 0.26.0, 99 percent');
  });
});

describe('the recomposed hover is byte identical to the Phase 58 strings', () => {
  for (const row of TABLE) {
    it(`${row.name} hovers "${row.hover}"`, () => {
      expect(ringHover(row.state)).toBe(row.hover);
    });
  }

  it('the full UpdateUiState satisfies the snapshot both modules take', () => {
    const full: UpdateUiState = {
      currentVersion: '0.31.0',
      stagedVersion: null,
      lastCheckedAt: null,
      needsUpdateRepair: false,
      ring: 'checking',
      ringVersion: null,
      ringPercent: null,
      failedDuring: null
    };
    expect(updateStageWords(full)).toBe('Checking for updates');
    expect(ringHover(full)).toBe('Checking for updates');
  });
});

describe('the pinned bundle fragment', () => {
  it('the ready words carry the exact fragment the refusals gate pins', () => {
    // build/assert-bundle-refusals.mjs, entry updater.ready-ring-promise.
    expect(
      updateStageWords(snap({ ring: 'ready', ringVersion: '0.26.0' }))
    ).toContain(' is ready. It installs when you quit.');
  });
});
