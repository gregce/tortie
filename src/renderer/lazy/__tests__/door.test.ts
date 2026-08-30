/**
 * Phase 165. The lazy door's own rules, run rather than read.
 *
 *  - one fetch, however many callers ask
 *  - a failed fetch is forgotten, so the next ask tries again
 *  - nothing is fetched by making a door
 *  - the source names the 300 ms reason, so a later round that swaps it
 *    back to React.lazy has to delete the measurement to do it
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lazyDoor } from '../door';

describe('lazyDoor (Phase 165)', () => {
  it('fetches nothing until asked, and once when asked twice', async () => {
    let calls = 0;
    const door = lazyDoor(async () => {
      calls += 1;
      return { answer: 42 };
    });
    expect(calls).toBe(0);
    await Promise.all([door.preload(), door.preload()]);
    expect(calls).toBe(1);
    await door.preload();
    expect(calls).toBe(1);
  });

  it('forgets a failed fetch so the next ask tries again', async () => {
    let calls = 0;
    const door = lazyDoor(async () => {
      calls += 1;
      if (calls === 1) throw new Error('no chunk today');
      return { ok: true };
    });
    await expect(door.preload()).rejects.toThrow('no chunk today');
    await expect(door.preload()).resolves.toBeUndefined();
    expect(calls).toBe(2);
  });

  it('states the measured reason it is not React.lazy', () => {
    const src = readFileSync(join(import.meta.dirname, '..', 'door.ts'), 'utf8');
    expect(src).toContain('FALLBACK_THROTTLE_MS');
    expect(src).toContain('300 ms');
    expect(src).not.toMatch(/React\.lazy\(/);
    // The only React it reaches is the three hooks; no boundary is imported.
    expect(src).toContain("import { useEffect, useReducer, useState } from 'react';");
  });
});
