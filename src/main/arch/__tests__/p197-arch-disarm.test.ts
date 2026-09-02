/**
 * Phase 197 item 7: the arch watch disarms when the switch goes off.
 *
 * Phase 175 recorded the seam in check-coordinator.ts rather than closing it:
 * its switch decided what Architecture SHOWS and not what it RUNS, so a
 * repository armed while the switch was on kept producing a check on every
 * file change after it went off. At the parent commit `disarmArchWatch` does
 * not exist and this file fails on the first call. At HEAD the settings
 * registrar calls it on the flip, and this test drives the same seam the
 * registrar does, being the watcher bus the arch watch already rides.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  disarmArchWatch,
  startArchWatch,
  stopArchWatch,
  watchArchRepo,
  watchedArchRepos
} from '../watch';
import { emitRepoChanged, resetRepoChangedListeners } from '../../watcher/bus';

const REPO = '/somewhere/project';

afterEach(() => {
  stopArchWatch();
  resetRepoChangedListeners();
});

describe('the arch watch disarms', () => {
  it('a change after the disarm produces no run, and a later load re-arms', async () => {
    const runs: string[] = [];
    startArchWatch(async (repoPath) => {
      runs.push(repoPath);
    });
    expect(watchArchRepo(REPO)).toBe(true);
    emitRepoChanged(REPO);
    await Promise.resolve();
    expect(runs).toEqual([REPO]);

    // Off means off.
    disarmArchWatch();
    expect(watchedArchRepos()).toEqual([]);
    emitRepoChanged(REPO);
    await Promise.resolve();
    expect(runs).toEqual([REPO]);

    // The subscription and the runner stayed, so the next load arms again
    // exactly as a first load does, and a change is a run once more.
    expect(watchArchRepo(REPO)).toBe(true);
    emitRepoChanged(REPO);
    await Promise.resolve();
    expect(runs).toEqual([REPO, REPO]);
  });

  it('is safe with nothing armed', () => {
    const spy = vi.fn();
    startArchWatch(async () => {
      spy();
    });
    expect(() => disarmArchWatch()).not.toThrow();
    expect(watchedArchRepos()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
