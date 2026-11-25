/**
 * Phase 371, S1 (build/p371/SPEC.md D10). The git store's own log is re-read
 * by a change that may have moved git's data and by no other; its status is
 * asked by every change, exactly as before.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const REPO = '/scratch/p371/repo';
const status = vi.fn(async () => null);
const log = vi.fn(async () => []);
let fire: ((repoPath: string, gitMoved?: boolean) => void) | null = null;

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve(),
    git: {
      status,
      log,
      onChanged: (cb: (repoPath: string, gitMoved?: boolean) => void) => {
        fire = cb;
        return () => undefined;
      }
    }
  }
});
vi.stubGlobal('requestAnimationFrame', () => 0);
vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useGit } = await import('../git');
const { REPO_CHANGED_DEBOUNCE_MS } = await import('../repo-changed');

const change = async (...message: [] | [boolean]): Promise<void> => {
  fire?.(REPO, ...message);
  await new Promise((r) => setTimeout(r, REPO_CHANGED_DEBOUNCE_MS + 50));
};

beforeEach(async () => {
  useGit.getState().init();
  await useGit.getState().refreshLog(REPO);
  expect(useGit.getState().repos[REPO]?.log).toEqual([]);
  status.mockClear();
  log.mockClear();
});

describe('S1 the git store answers a change', () => {
  it('asks status and never the log when git’s own data did not move', async () => {
    await change(false);
    expect(status).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  it('asks both when it may have moved, and when the message does not say', async () => {
    await change(true);
    expect(status).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
    await change();
    expect(status).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(2);
  });
});
