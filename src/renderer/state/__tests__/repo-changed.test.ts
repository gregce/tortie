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
  source: (cb: (repoPath: string, gitMoved?: boolean) => void) => () => void;
  emit: (repoPath: string, gitMoved?: boolean) => void;
  attachCount: () => number;
} {
  const subs: Array<(repoPath: string, gitMoved?: boolean) => void> = [];
  return {
    source: (cb) => {
      subs.push(cb);
      return () => {
        const i = subs.indexOf(cb);
        if (i >= 0) subs.splice(i, 1);
      };
    },
    emit: (...message) => {
      for (const cb of [...subs]) cb(...message);
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
    expect(a).toHaveBeenCalledWith('/repo', true);
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

    expect(seen.mock.calls).toEqual([['/a', true]]);
    vi.advanceTimersByTime(100);
    expect(seen.mock.calls).toEqual([['/a', true], ['/b', true]]);
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

  // Phase 371: the one bit, whether git's own data may have moved.

  it('R1 joins two messages of one window as OR, in both orders', () => {
    for (const order of [
      [true, false],
      [false, true]
    ]) {
      const { source, emit } = fakeSource();
      const bus = createRepoChangeBus(source);
      const seen = vi.fn();
      bus.subscribe(seen);

      for (const gitMoved of order) {
        emit('/repo', gitMoved);
        vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS - 1);
      }
      vi.advanceTimersByTime(1);
      expect(seen.mock.calls).toEqual([['/repo', true]]);
    }
  });

  it('R2 reads a message that carries nothing as a move', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const seen = vi.fn();
    bus.subscribe(seen);

    emit('/repo');
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    emit('/repo', undefined);
    emit('/repo', false);
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    expect(seen.mock.calls).toEqual([
      ['/repo', true],
      ['/repo', true]
    ]);
  });

  it('R3 hands over a false window, and the next window starts clean', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const seen = vi.fn();
    bus.subscribe(seen);

    for (const gitMoved of [false, true, false]) {
      emit('/repo', gitMoved);
      vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    }
    expect(seen.mock.calls).toEqual([
      ['/repo', false],
      ['/repo', true],
      ['/repo', false]
    ]);
  });

  it('R4 keeps the bit per repo, and wakes a listener that takes one argument', () => {
    const { source, emit } = fakeSource();
    const bus = createRepoChangeBus(source);
    const seen = vi.fn();
    const plain: string[] = [];
    bus.subscribe(seen);
    bus.subscribe((repoPath) => {
      plain.push(repoPath);
    });

    emit('/a', true);
    emit('/b', false);
    vi.advanceTimersByTime(REPO_CHANGED_DEBOUNCE_MS);
    expect(seen.mock.calls).toEqual([
      ['/a', true],
      ['/b', false]
    ]);
    expect(plain).toEqual(['/a', '/b']);
  });
});
