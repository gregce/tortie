/**
 * Phase 183: the flight latch unsticks.
 *
 * The recorded defect (Phase 171 commit 32ec650, its NOT TRUE clause):
 * enterOverviewFlight awaited a bare requestAnimationFrame before the
 * finally that clears the flying latch. Chromium stops the frame clock
 * entirely for an occluded window, so locking the screen mid flight left
 * the latch held and every later Catch Me Up toggle was dropped in silence
 * until a frame fired.
 *
 * The first test below is the honest proof. It installs a frame clock that
 * NEVER fires, exactly what occlusion does, and asserts the latch opens in
 * bounded time anyway. At the parent commit this test fails: the second
 * commit never runs and FLIGHT_CLASS never comes off. At HEAD it passes.
 *
 * The second test holds the normal path still: when frames DO fire, the
 * commit runs at the fade's end and not a millisecond earlier, and the
 * class comes off on the frame, so the fix moves nothing a person can see.
 *
 * The vitest environment is node and jsdom is not a dependency of this
 * repository, so the DOM is the same hand built stub shape
 * focus-flight.test.ts uses, and the store and copy builder are mocked at
 * the seams focus-flight.ts already has.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../state/store', () => ({
  useApp: { getState: () => ({ sessions: [], visibleSessionIds: [] }) },
  effectiveStatusOf: () => 'running'
}));

vi.mock('../../app/focus-copy', () => ({
  buildStillCopy: vi.fn(() => Promise.resolve(null))
}));

/** A `classList` that answers add, remove and contains, and nothing else. */
function classList(): {
  add(name: string): void;
  remove(name: string): void;
  contains(name: string): boolean;
} {
  const held = new Set<string>();
  return {
    add: (name) => {
      held.add(name);
    },
    remove: (name) => {
      held.delete(name);
    },
    contains: (name) => held.has(name)
  };
}

interface Shell {
  classList: ReturnType<typeof classList>;
  attrs: Record<string, string>;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
}

/**
 * Install the stub DOM. `frames` picks the frame clock: 'fires' schedules
 * every callback on a zero timeout, 'never' swallows every callback, which
 * is byte for byte what Chromium does to an occluded window.
 */
function installDom(frames: 'fires' | 'never'): Shell {
  const attrs: Record<string, string> = {};
  const shell: Shell = {
    classList: classList(),
    attrs,
    setAttribute: (name, value) => {
      attrs[name] = value;
    },
    removeAttribute: (name) => {
      delete attrs[name];
    },
    hasAttribute: (name) => name in attrs
  };
  vi.stubGlobal('document', {
    documentElement: {},
    querySelector: (sel: string) => (sel === '.shell' ? shell : null)
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false })
  });
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) =>
      name === '--dur-panel' ? '200ms' : 'cubic-bezier(0.2, 0, 0, 1)'
  }));
  vi.stubGlobal(
    'requestAnimationFrame',
    frames === 'never'
      ? () => 0
      : (cb: (t: number) => void) => {
          setTimeout(() => {
            cb(0);
          }, 0);
          return 0;
        }
  );
  return shell;
}

/** The flight duration the stubbed --dur-panel token declares. */
const FADE_MS = 200;
/**
 * How long the occluded test waits after the fade before it demands the
 * latch open. Any bound the fix picks must be well inside this, and the
 * parent's bare frame wait is longer than every number, which is the point.
 */
const GENEROUS_MS = 5000;

/** A fresh module per test, because the flying latch is module state. */
async function loadFlight(): Promise<
  typeof import('../overview-flight')
> {
  vi.resetModules();
  return await import('../overview-flight');
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the flight latch under an occluded window (Phase 183)', () => {
  it('opens in bounded time when no frame ever fires, so the next toggle still flies', async () => {
    const shell = installDom('never');
    const { enterOverviewFlight } = await loadFlight();
    const commits: string[] = [];

    // First flight. The fade's timer fires even occluded; the frame never
    // does. At the parent commit the latch is now held forever.
    void enterOverviewFlight(() => commits.push('first'));
    await vi.advanceTimersByTimeAsync(FADE_MS);
    expect(commits).toEqual(['first']);

    await vi.advanceTimersByTimeAsync(GENEROUS_MS);
    expect(
      shell.classList.contains('gmux-focusing'),
      'FLIGHT_CLASS must come off in bounded time with no frame'
    ).toBe(false);

    // The second toggle is the user-visible claim: at the parent it is
    // silently dropped, at HEAD it flies.
    const second = enterOverviewFlight(() => commits.push('second'));
    await vi.advanceTimersByTimeAsync(FADE_MS + GENEROUS_MS);
    expect(
      commits,
      'a toggle after an occluded flight must not be dropped'
    ).toEqual(['first', 'second']);
    await second;
  });

  it('keeps the normal path: the commit waits the whole fade and the class rides the frame', async () => {
    const shell = installDom('fires');
    const { enterOverviewFlight } = await loadFlight();
    const commits: string[] = [];

    const flight = enterOverviewFlight(() => commits.push('open'));
    // One millisecond before the fade ends, nothing has committed and the
    // chrome is still fading under FLIGHT_CLASS.
    await vi.advanceTimersByTimeAsync(FADE_MS - 1);
    expect(commits).toEqual([]);
    expect(shell.classList.contains('gmux-focusing')).toBe(true);

    // The fade ends, the commit runs, and the frame (a zero timeout here)
    // takes the class off. No hundred-millisecond bound is waited out.
    await vi.advanceTimersByTimeAsync(1);
    expect(commits).toEqual(['open']);
    await vi.advanceTimersByTimeAsync(1);
    expect(shell.classList.contains('gmux-focusing')).toBe(false);
    await flight;

    // The latch is open again at once.
    const again = enterOverviewFlight(() => commits.push('again'));
    await vi.advanceTimersByTimeAsync(FADE_MS + 1);
    expect(commits).toEqual(['open', 'again']);
    await again;
  });
});
