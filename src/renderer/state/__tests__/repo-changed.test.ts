/**
 * The debounced git:changed fan-out (research 25 §3 B4, Phase 16 step 4).
 *
 * These are the properties the four hand-rolled copies each implemented
 * separately and could each get wrong: one bridge subscription no matter how
 * many surfaces listen, one delivery per repo per burst, per-repo
 * independence, and an unsubscribe that actually stops delivery.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRepoChangeBus, REPO_CHANGED_DEBOUNCE_MS } from '../repo-changed';

/** A stand-in for `gmux.git.onChanged`, with a handle to emit events. */
function fakeSource(): {
  source: (cb: (repoPath: string) => void) => () => void;
  emit: (repoPath: string) => void;
  attachCount: () => number;
} {
  const subs: Array<(repoPath: string) => void> = [];
  return {
    source: (cb) => {
      subs.push(cb);
      return () => {
        const i = subs.indexOf(cb);
        if (i >= 0) subs.splice(i, 1);
      };
    },
    emit: (repoPath) => {
      for (const cb of [...subs]) cb(repoPath);
    },
    attachCount: () => subs.length
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createRepoChangeBus', () => {
  it('attaches to the bridge lazily, and exactly once for many listeners', () => {
    const { source, attachCount } = fakeSource();
    const bus = createRepoChangeBus(source);
    expect(attachCount()).toBe(0);

    bus.subscribe(() => undefined);
    bus.subscribe(() => undefined);
    bus.subscribe(() => undefined);

    expect(attachCount()).toBe(1);
  });

  it('coalesces a burst into ONE delivery per listener', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);

    for (let i = 0; i < 20; i++) emit('/repo');
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS - 1);
    expect(a).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith('/repo');
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('restarts the window while events keep arriving', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const seen = vi.fn();
    bus.subscribe(seen);

    emit('/repo');
    vi.advanceTimersByTime(100);
    emit('/repo');
    vi.advanceTimersByTime(100);
    expect(seen).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('keeps one timer per repo — two repos do not share a window', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const seen = vi.fn();
    bus.subscribe(seen);

    emit('/a');
    vi.advanceTimersByTime(100);
    emit('/b');
    vi.advanceTimersByTime(50);

    expect(seen.mock.calls).toEqual([['/a']]);
    vi.advanceTimersByTime(100);
    expect(seen.mock.calls).toEqual([['/a'], ['/b']]);
  });

  it('stops delivering after unsubscribe, without disturbing the others', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const stays = vi.fn();
    const goes = vi.fn();
    bus.subscribe(stays);
    const off = bus.subscribe(goes);

    off();
    emit('/repo');
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);

    expect(goes).not.toHaveBeenCalled();
    expect(stays).toHaveBeenCalledTimes(1);
  });

  it('survives a listener that unsubscribes from inside its own callback', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const later = vi.fn();
    const off = bus.subscribe(() => {
      off();
    });
    bus.subscribe(later);

    emit('/repo');
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    expect(later).toHaveBeenCalledTimes(1);

    emit('/repo');
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    expect(later).toHaveBeenCalledTimes(2);
  });
});
