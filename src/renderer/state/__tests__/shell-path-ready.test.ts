/**
 * The Restore gate's one renderer fact (Phase 81).
 *
 * The session list arrives before the login shell answers now, so Restore is
 * drawn about a second before Tortie can honour it. `shellPathReady` is what
 * the five Restore controls read, and it has exactly two arms:
 *
 *  - a preload that can answer starts the flag FALSE and flips it to true
 *    when main says the PATH is installed.
 *  - a preload that cannot answer starts it TRUE, which is the behaviour
 *    every build before this phase had.
 *
 * This file covers the first arm. The second is covered in
 * ./subscriptions.test.ts, whose bridge stub has no such method, so its
 * `shellPathReady` is true before any boot runs.
 *
 * Runner: vitest (`npm test`).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionStatus } from '@shared/types';

/** Held open so the test can decide when main answers. */
let releaseShellPath: (() => void) | null = null;
let shellPathCalls = 0;

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1440,
  gmux: {
    setSessionsPosition: () => Promise.resolve(),
    projects: {
      list: () => Promise.resolve([{ id: 'proj-1', name: 'repo', path: '/repo' }])
    },
    sessions: {
      list: () => Promise.resolve([] as Session[]),
      onChanged: (_cb: (sessions: Session[]) => void) => () => undefined,
      onStatusChanged: (_cb: (id: string, s: SessionStatus) => void) => () =>
        undefined,
      restore: (_id: string) => Promise.resolve({} as Session),
      shellPathReady: () => {
        shellPathCalls += 1;
        return new Promise<void>((r) => {
          releaseShellPath = r;
        });
      }
    },
    scrollback: {
      onNotice: (_cb: (notice: unknown) => void) => () => undefined
    },
    notice: { pending: () => Promise.resolve([]) },
    onActivityChanged: (_cb: (updates: unknown[]) => void) => () => undefined
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useApp } = await import('../store');

/** Let fire-and-forget promise chains settle. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  useApp.setState({ toasts: [] } as never);
});

describe('shellPathReady', () => {
  it('starts false on a preload that can answer, and flips when main does', async () => {
    expect(useApp.getState().shellPathReady).toBe(false);
    await useApp.getState().boot();
    await settle();
    // The session list is on screen and the shell has still said nothing.
    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().shellPathReady).toBe(false);
    expect(shellPathCalls).toBe(1);
    releaseShellPath?.();
    await settle();
    expect(useApp.getState().shellPathReady).toBe(true);
  });
});
