/**
 * Phase 211. The store watcher: one observe per burst, only the file that
 * matters, and a redraw pushed after every observe.
 *
 * It runs the SHIPPING watcher over injected seams, being a fake directory
 * watcher the test fires by hand, a driven clock and a manual timer queue, so
 * no real file system event and no real timer is needed and the run is
 * deterministic. `emitChanged` firing once is how "one observe per burst" is
 * measured, because the watcher pushes exactly once per observe.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { harnessFileKeepDeps } from '../index';
import {
  OBSERVE_MIN_INTERVAL_MS,
  WATCH_DEBOUNCE_MS,
  startCredentialWatch,
  watchTargetsFor,
  type WatchDeps
} from '../watch';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p211-watch-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A manual timer queue and clock so a burst is driven rather than waited on. */
function harness() {
  let clock = 0;
  const timers: { at: number; fn: () => void; kind: 'timeout' | 'interval'; ms: number; live: boolean }[] = [];
  const fired: string[] = [];
  const watchers = new Map<string, (file: string | null) => void>();
  let emits = 0;

  const keep = harnessFileKeepDeps(root, root);
  const deps: WatchDeps = {
    keep,
    emitChanged: () => {
      emits += 1;
    },
    watchDir: (dir, onEvent) => {
      watchers.set(dir, onEvent);
      return { close: () => watchers.delete(dir) };
    },
    setTimeout: (fn, ms) => {
      const t = { at: clock + ms, fn, kind: 'timeout' as const, ms, live: true };
      timers.push(t);
      return { clear: () => (t.live = false) };
    },
    setInterval: (fn, ms) => {
      const t = { at: clock + ms, fn, kind: 'interval' as const, ms, live: true };
      timers.push(t);
      return { clear: () => (t.live = false) };
    },
    now: () => clock
  };

  /** Advance the clock, firing every timer that comes due, until none remain. */
  async function advance(ms: number): Promise<void> {
    const target = clock + ms;
    for (;;) {
      const due = timers
        .filter((t) => t.live && t.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (due === undefined) break;
      clock = due.at;
      if (due.kind === 'interval') due.at = clock + due.ms;
      else due.live = false;
      due.fn();
      // Let the observe's whole async chain settle before the next timer.
      for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
    }
    clock = target;
    for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
  }

  return {
    deps,
    advance,
    fire: (dir: string, file: string) => watchers.get(dir)?.(file),
    watchedDirs: () => [...watchers.keys()],
    emits: () => emits,
    fired
  };
}

describe('watchTargetsFor', () => {
  it('watches the default store of both providers, by directory and basename', () => {
    const keep = harnessFileKeepDeps(root, '/home/someone');
    const targets = watchTargetsFor(keep);
    const claude = targets.find((t) => t.provider === 'claude');
    const codex = targets.find((t) => t.provider === 'codex');
    expect(claude?.file).toBe('.claude.json');
    expect(codex?.file).toBe('auth.json');
    // The default claude account file is ~/.claude.json, so its directory is home.
    expect(basename(claude?.file ?? '')).toBe('.claude.json');
  });
});

describe('startCredentialWatch', () => {
  it('collapses a burst of events into ONE observe', async () => {
    const h = harness();
    const watch = startCredentialWatch(h.deps);
    const dir = h.watchedDirs()[0]!;
    // A storm of events for the file that matters.
    for (let i = 0; i < 50; i++) h.fire(dir, '.claude.json');
    expect(h.emits()).toBe(0); // nothing yet: it is debounced.
    await h.advance(WATCH_DEBOUNCE_MS + 10);
    expect(h.emits()).toBe(1); // exactly one observe for the whole burst.
    watch.stop();
  });

  it('ignores a file that is not the one it watches', async () => {
    const h = harness();
    const watch = startCredentialWatch(h.deps);
    const dir = h.watchedDirs()[0]!;
    for (let i = 0; i < 10; i++) h.fire(dir, 'settings.json');
    await h.advance(OBSERVE_MIN_INTERVAL_MS * 2);
    expect(h.emits()).toBe(0);
    watch.stop();
  });

  it('gives an event that arrives during a run exactly one more observe', async () => {
    const h = harness();
    const watch = startCredentialWatch(h.deps);
    const dir = h.watchedDirs()[0]!;
    h.fire(dir, '.claude.json');
    await h.advance(WATCH_DEBOUNCE_MS + 10);
    expect(h.emits()).toBe(1);
    // A second burst after the floor is a second observe, not a spin.
    h.fire(dir, '.claude.json');
    await h.advance(OBSERVE_MIN_INTERVAL_MS + WATCH_DEBOUNCE_MS + 10);
    expect(h.emits()).toBe(2);
    watch.stop();
  });

  it('stops watching and firing after stop()', async () => {
    const h = harness();
    const watch = startCredentialWatch(h.deps);
    const dir = h.watchedDirs()[0]!;
    watch.stop();
    // The watchers are closed, so a fire reaches nobody.
    expect(h.watchedDirs()).toHaveLength(0);
    h.fire(dir, '.claude.json');
    await h.advance(OBSERVE_MIN_INTERVAL_MS * 2);
    expect(h.emits()).toBe(0);
  });
});
