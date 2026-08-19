/**
 * Phase 90.3. What has changed in a folder on another machine.
 *
 * FOUR THINGS THIS PROVES, and each is a rule the phase set rather than an
 * implementation detail.
 *
 *  1. The store is keyed by the PAIR. Two folders at ONE path on two computers
 *     are two entries, and neither can read the other's rows. That is the wrong
 *     machine defect the whole round exists to remove.
 *  2. NO TIMER, ANYWHERE. Nothing in this module schedules a second read. The
 *     test advances fake timers by five minutes and counts the calls.
 *  3. It has no verb that writes. The store's whole surface is three functions
 *     and none of them can change anything on either computer.
 *  4. A machine that did not answer is a state and not a thrown error, so the
 *     view draws a sentence rather than a stack.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reviewFiles = vi.fn();

vi.stubGlobal('window', { gmux: { machines: { reviewFiles } } });

const { remoteChangesAvailable, remoteChangesOf, useRemoteChanges } =
  await import('../remote-changes');

const STUDIO = { machineId: 'studio', path: '/home/greg/api' };
const ATTIC = { machineId: 'attic', path: '/home/greg/api' };
const HERE = { machineId: 'local', path: '/home/greg/api' };

function answer(over: Record<string, unknown> = {}): unknown {
  return {
    machineId: 'studio',
    machineLabel: 'Studio',
    repoPath: '/home/greg/api',
    files: [{ path: 'src/auth.ts', origPath: null, status: 'M' }],
    total: 1,
    note: null,
    ...over
  };
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useRemoteChanges.setState({ byTarget: {} });
  reviewFiles.mockReset();
  reviewFiles.mockResolvedValue(answer());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the read', () => {
  it('is available only when the bridge has the method', () => {
    expect(remoteChangesAvailable()).toBe(true);
  });

  it('asks the machine for the folder ON THAT MACHINE', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    expect(reviewFiles).toHaveBeenCalledWith({
      machineId: 'studio',
      cwd: '/home/greg/api'
    });
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.files).toHaveLength(1);
    expect(entry.repoPath).toBe('/home/greg/api');
    expect(entry.notRepo).toBe(false);
    expect(entry.failed).toBe(false);
    expect(entry.readAt).toBeGreaterThan(0);
  });

  it('reads once for a target that has been read, and again on Refresh', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().ensure(STUDIO);
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    expect(reviewFiles).toHaveBeenCalledTimes(1);

    await useRemoteChanges.getState().refresh(STUDIO);
    expect(reviewFiles).toHaveBeenCalledTimes(2);
  });
});

describe('the key is the pair, never the path', () => {
  it('keeps two machines at one path apart', async () => {
    reviewFiles.mockResolvedValueOnce(answer());
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    reviewFiles.mockResolvedValueOnce(
      answer({
        machineId: 'attic',
        machineLabel: 'Attic',
        files: [],
        total: 0,
        note: 'nothing'
      })
    );
    useRemoteChanges.getState().ensure(ATTIC);
    await flush();

    const byTarget = useRemoteChanges.getState().byTarget;
    expect(remoteChangesOf(byTarget, STUDIO).files).toHaveLength(1);
    expect(remoteChangesOf(byTarget, ATTIC).files).toHaveLength(0);
    // A folder on THIS Mac at the same path reads neither of them.
    expect(remoteChangesOf(byTarget, HERE).files).toHaveLength(0);
    expect(remoteChangesOf(byTarget, HERE).readAt).toBe(0);
    expect(remoteChangesOf(byTarget, null).readAt).toBe(0);
  });

  it('forgets one target and leaves the other alone', async () => {
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    useRemoteChanges.getState().ensure(ATTIC);
    await flush();
    useRemoteChanges.getState().forget(STUDIO);
    const byTarget = useRemoteChanges.getState().byTarget;
    expect(remoteChangesOf(byTarget, STUDIO).readAt).toBe(0);
    expect(remoteChangesOf(byTarget, ATTIC).readAt).toBeGreaterThan(0);
  });
});

describe('no timer, anywhere', () => {
  it('makes no second call in five minutes of clock', async () => {
    vi.useFakeTimers();
    useRemoteChanges.getState().ensure(STUDIO);
    await vi.advanceTimersByTimeAsync(1);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(reviewFiles).toHaveBeenCalledTimes(1);
  });

  it('holds no timer id and no interval in its own source', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(import.meta.dirname, '../remote-changes.ts'),
      'utf8'
    );
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('requestAnimationFrame');
  });
});

describe('what a machine said is a state and never a thrown error', () => {
  it('records a folder that is not a repository', async () => {
    reviewFiles.mockResolvedValueOnce(
      answer({ repoPath: '', files: [], total: 0, note: 'not a repository' })
    );
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.notRepo).toBe(true);
    // Main's own sentence is dropped for this case, because the view draws its
    // own for it and two sentences saying one thing is one too many.
    expect(entry.note).toBeNull();
  });

  it('records a machine that did not answer, and throws nothing', async () => {
    reviewFiles.mockRejectedValueOnce(new Error('no answer'));
    await expect(
      useRemoteChanges.getState().refresh(STUDIO)
    ).resolves.toBeUndefined();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.failed).toBe(true);
    expect(entry.loading).toBe(false);
    expect(entry.refreshing).toBe(false);
  });

  it('keeps main sentence under a capped list', async () => {
    reviewFiles.mockResolvedValueOnce(
      answer({ total: 900, note: 'Showing the first 200 of 900 files.' })
    );
    useRemoteChanges.getState().ensure(STUDIO);
    await flush();
    const entry = remoteChangesOf(useRemoteChanges.getState().byTarget, STUDIO);
    expect(entry.note).toBe('Showing the first 200 of 900 files.');
    expect(entry.total).toBe(900);
  });
});

describe('it has no verb that writes', () => {
  it('offers exactly three functions and none of them changes a machine', () => {
    const state = useRemoteChanges.getState() as unknown as Record<
      string,
      unknown
    >;
    const verbs = Object.keys(state).filter(
      (key) => typeof state[key] === 'function'
    );
    expect(verbs.sort()).toEqual(['ensure', 'forget', 'refresh']);
  });
});
