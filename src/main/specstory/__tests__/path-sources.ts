/**
 * The two PATH inputs of src/main/tmux/resolve.ts, under test control.
 *
 * WHY THIS IS SHARED. Both specstory resolver suites — resolve.test.ts and
 * capture.test.ts — must neutralise the same two functions for the same
 * reason: the real `extraBinDirs()` always includes /opt/homebrew/bin, so a
 * test that leaned on the machine's own $PATH would find whatever specstory
 * this Mac happens to have installed and pass or fail accordingly. Written
 * twice during the Phase 18.5 parallel build, it is written once here.
 *
 * WHY IT IS A MUTABLE OBJECT AND NOT TWO `let`s. `vi.mock` is hoisted above
 * every import in the file that calls it, so its factory cannot close over a
 * module-level binding declared below it. A single object imported by both the
 * factory and the test bodies gives them one thing to point at: the factory
 * reads `sources.userPath` at call time, and a test assigns it in `beforeEach`.
 *
 * `vi.mock` itself stays in each test file. It has to — vitest hoists the call
 * per module, so it cannot be issued from here on another file's behalf.
 */

import { vi } from 'vitest';

/** Assign these in a test; the mocked module reads them at call time. */
export const pathSources: { userPath: string; extraDirs: string[] } = {
  userPath: '',
  extraDirs: []
};

/** Back to the empty defaults, for a `beforeEach`. */
export function resetPathSources(): void {
  pathSources.userPath = '';
  pathSources.extraDirs = [];
}

/**
 * The replacement module: everything `tmux/resolve` really exports, with only
 * the two PATH sources swapped. `resolveBinaryAgainst` deliberately stays
 * real — it is the logic under test in the callers, not a thing to fake.
 */
export async function tmuxResolveMock(): Promise<
  typeof import('../../tmux/resolve')
> {
  const actual =
    await vi.importActual<typeof import('../../tmux/resolve')>(
      '../../tmux/resolve'
    );
  return {
    ...actual,
    getUserPath: () => Promise.resolve(pathSources.userPath),
    extraBinDirs: () => pathSources.extraDirs
  };
}
