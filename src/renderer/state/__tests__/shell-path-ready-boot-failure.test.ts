/**
 * The Restore gate survives a boot read that fails (Phase 81.1).
 *
 * Phase 81 asked main for the shell PATH answer at the END of the boot try
 * block, after the project list and the session list were awaited. If either
 * of those reads threw with an error that is not one of the three boot block
 * codes, the catch marked the app ready, sessions still arrived on their own
 * channel, and the question was never asked. The flag stayed false for the
 * whole run, so all five Restore controls stayed greyed under a sentence that
 * was no longer true, and quitting was the only way out. Restore worked in
 * that state before Phase 81, so it was a regression.
 *
 * This file is the regression test. The session list rejects with an ordinary
 * error that carries no payload and no boot block code. The test asserts that
 * the shell PATH question was still asked, and that the flag flips when main
 * answers, which is what makes the five controls pressable again.
 *
 * It fails if the call is moved back after the two awaits.
 *
 * Runner: vitest (`npm test`).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, SessionStatus } from '@shared/types';

/** Held open so the test can decide when main answers. */
let releaseShellPath: (() => void) | null = null;
let shellPathCalls = 0;

/** An ordinary failure. No JSON payload, so no boot block code either. */
const LIST_FAILURE = 'the session list could not be read';

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
      list: () => Promise.reject(new Error(LIST_FAILURE)),
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

describe('shellPathReady when a boot read fails', () => {
  it('is still asked for, and Restore turns on when main answers', async () => {
    expect(useApp.getState().shellPathReady).toBe(false);
    await useApp.getState().boot();
    await settle();

    // The boot read failed the ordinary way. The app is ready, there is no
    // boot block screen, and the failure is a toast.
    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().bootBlock).toBe(null);
    expect(useApp.getState().toasts.some((t) => t.text === LIST_FAILURE)).toBe(
      true
    );

    // The regression: this was 0, because the question sat after the awaits.
    expect(shellPathCalls).toBe(1);
    expect(useApp.getState().shellPathReady).toBe(false);

    // And when main answers, the five Restore controls turn on.
    releaseShellPath?.();
    await settle();
    expect(useApp.getState().shellPathReady).toBe(true);
    expect(useApp.getState().canRestore()).toBe(true);
  });
});
