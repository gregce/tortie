/**
 * Phase 163: the observation Phase 151 left owed, over the same injected
 * backend the contract test uses. A dropped batch is counted, the re-read it
 * schedules is counted, the re-read that runs is counted, and drops that
 * keep coming with no re-read completing produce one warning in the log.
 * No FSEvents stream is opened.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakeCb = (err: Error | null, events: { type: string; path: string }[]) => void;
const subs: { dir: string; cb: FakeCb }[] = [];

vi.mock('@parcel/watcher', () => {
  const subscribe = (dir: string, cb: FakeCb): Promise<{ unsubscribe: () => Promise<void> }> => {
    subs.push({ dir, cb });
    return Promise.resolve({ unsubscribe: () => Promise.resolve() });
  };
  return { default: { subscribe }, subscribe };
});

const warned: string[] = [];
vi.mock('../../log', () => ({
  getLog: () => ({
    error: () => undefined,
    warn: (msg: string) => { warned.push(msg); },
    info: () => undefined,
    debug: () => undefined
  })
}));

const { RepoWatcher } = await import('../repo-watcher');

const DEBOUNCE_MS = 20;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const DROP = new Error('Events were dropped by the FSEvents client. File system must be re-scanned.');

let dir = '';
beforeEach(() => {
  subs.length = 0;
  warned.length = 0;
  dir = mkdtempSync(join(tmpdir(), 'gmux-watch-obs-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('RepoWatcher observation', () => {
  it('starts at zero and counts a drop, its scheduled re-read and its completion', async () => {
    let changes = 0;
    const rw = await RepoWatcher.watch(dir, { debounceMs: DEBOUNCE_MS, onChange: () => { changes += 1; }, onError: () => undefined });
    try {
      expect(rw.observation).toEqual({ drops: 0, rescansScheduled: 0, rescansCompleted: 0 });
      subs[0]!.cb(DROP, []);
      expect(rw.observation).toEqual({ drops: 1, rescansScheduled: 1, rescansCompleted: 0 });
      await wait(DEBOUNCE_MS * 4);
      expect(rw.observation).toEqual({ drops: 1, rescansScheduled: 1, rescansCompleted: 1 });
      expect(changes).toBe(1);
      expect(warned).toEqual([]);
    } finally {
      await rw.dispose();
    }
  });

  it('coalesces drops inside one window into one scheduled re-read', async () => {
    const rw = await RepoWatcher.watch(dir, { debounceMs: DEBOUNCE_MS, onChange: () => undefined, onError: () => undefined });
    try {
      subs[0]!.cb(DROP, []);
      subs[0]!.cb(DROP, []);
      subs[0]!.cb(DROP, []);
      expect(rw.observation).toEqual({ drops: 3, rescansScheduled: 1, rescansCompleted: 0 });
      await wait(DEBOUNCE_MS * 4);
      expect(rw.observation.rescansCompleted).toBe(1);
    } finally {
      await rw.dispose();
    }
  });

  it('does not count an ordinary event or an ordinary error as a drop', async () => {
    const rw = await RepoWatcher.watch(dir, { debounceMs: DEBOUNCE_MS, onChange: () => undefined, onError: () => undefined });
    try {
      subs[0]!.cb(null, [{ type: 'update', path: join(dir, 'a.txt') }]);
      subs[0]!.cb(new Error('something else'), []);
      await wait(DEBOUNCE_MS * 4);
      expect(rw.observation).toEqual({ drops: 0, rescansScheduled: 0, rescansCompleted: 0 });
    } finally {
      await rw.dispose();
    }
  });

  it('warns once drops keep arriving and no re-read completed within two windows', async () => {
    const rw = await RepoWatcher.watch(dir, { debounceMs: DEBOUNCE_MS, onChange: () => undefined, onError: () => undefined });
    try {
      // Hold the flush timer open by faking a window that never fires: the
      // simplest honest way is a huge debounce on a second watcher.
      await rw.dispose();
      const slow = await RepoWatcher.watch(dir, { debounceMs: 60_000, onChange: () => undefined, onError: () => undefined });
      try {
        const sub = subs[subs.length - 1]!;
        sub.cb(DROP, []);
        expect(warned).toEqual([]);
        // Two windows of the real 300 ms debounce would be too slow to wait
        // out, so drive the clock: the alarm reads Date.now().
        const realNow = Date.now;
        Date.now = () => realNow() + 60_000 * 3;
        try {
          sub.cb(DROP, []);
        } finally {
          Date.now = realNow;
        }
        expect(warned).toHaveLength(1);
        expect(warned[0]).toMatch(/2 dropped batches and no re-read has completed/);
      } finally {
        await slow.dispose();
      }
    } finally {
      await rw.dispose();
    }
  });
});
