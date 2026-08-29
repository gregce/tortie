/**
 * The drift trigger's decisions (Phase 159), pure and without a store.
 *
 * The runner owns `no-drift`, `interval`, `same-input`, `in-flight` and the
 * confirm gate. What is proved here is the part the runner cannot see: a
 * check with no agent chosen never reaches it, an empty drift never reaches
 * it, and a settle hold defers it. Plus the two small readers the check and
 * the load share.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDrift } from '@shared/arch';
import { driftFace, firstPartyPairs, repairSkipReason } from '../repair-trigger';

function drift(count = 1): ArchDrift {
  return {
    promises: [],
    quotes: [],
    parts: [],
    componentIds: ['app', 'store'],
    edgeIds: ['app-must-not-store'],
    count
  };
}

describe('repairSkipReason', () => {
  it('reaches the runner only with an agent chosen, a real drift and nothing held', () => {
    expect(repairSkipReason({ chosen: true, held: [], drift: drift() })).toBeNull();
  });

  it('is silent for a repository with no agent, whatever drifted', () => {
    expect(repairSkipReason({ chosen: false, held: [], drift: drift(3) })).toBe('no-choice');
    expect(
      repairSkipReason({ chosen: false, held: ['edge:x'], drift: drift(3) })
    ).toBe('no-choice');
  });

  it('is silent for an empty drift with nothing held', () => {
    expect(repairSkipReason({ chosen: true, held: [], drift: null })).toBe('no-drift');
  });

  it('names the hold before it looks at the drift, because a held downgrade publishes the old verdict and reads as no drift', () => {
    expect(repairSkipReason({ chosen: true, held: ['edge:x'], drift: null })).toBe('held');
    expect(
      repairSkipReason({ chosen: true, held: ['edge:app-must-not-store'], drift: drift() })
    ).toBe('held');
  });
});

describe('driftFace', () => {
  it('is the count and nothing else', () => {
    expect(driftFace(null)).toEqual({ count: 0 });
    expect(driftFace(drift(4))).toEqual({ count: 4 });
    expect(Object.keys(driftFace(drift(4)))).toEqual(['count']);
  });
});

describe('firstPartyPairs', () => {
  it('keeps only imports that resolved to a tracked file, in order', () => {
    expect(
      firstPartyPairs([
        { fromPath: 'src/app/a.ts', toPath: 'src/store/s.ts' },
        { fromPath: 'src/app/a.ts', toPath: null },
        { fromPath: 'src/core/c.ts', toPath: 'src/store/s.ts' }
      ])
    ).toEqual([
      { fromPath: 'src/app/a.ts', toPath: 'src/store/s.ts' },
      { fromPath: 'src/core/c.ts', toPath: 'src/store/s.ts' }
    ]);
  });

  it('drops extra fields so the composer sees only the pair', () => {
    const [pair] = firstPartyPairs([
      { fromPath: 'a.ts', toPath: 'b.ts', line: 3, specifier: './b' } as {
        fromPath: string;
        toPath: string | null;
      }
    ]);
    expect(Object.keys(pair ?? {})).toEqual(['fromPath', 'toPath']);
  });
});
