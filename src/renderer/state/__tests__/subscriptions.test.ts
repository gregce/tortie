/**
 * The renderer lifecycle owner (Phase 42 stage 4).
 *
 * Hydration and event subscription used to share one boot() body, so every
 * retry attached a second set of bridge handlers and one notice could toast
 * twice. These tests pin the separation, from the store's own boot()/
 * retryBoot() surface down to the disposer:
 *
 * - repeated start: a second boot() hydrates again and registers NOTHING.
 * - retry: the tmux-missing path hydrates fresh state without resubscribing.
 * - cleanup: the disposer detaches every handler and re-arms the next start.
 * - notice drain: the pre-window backlog is drained once per handler set.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DurabilityNotice, GmuxNotice } from '@shared/notice';
import type { Session, SessionStatus } from '@shared/types';

/** Per-channel registration and un-registration counters. */
const counts = {
  onChanged: 0,
  onStatusChanged: 0,
  onNotice: 0,
  onActivityChanged: 0,
  unsubChanged: 0,
  unsubStatus: 0,
  unsubNotice: 0,
  unsubActivity: 0,
  pendingCalls: 0,
  listCalls: 0
};

let failListsWith: Error | null = null;
let pending: DurabilityNotice[] = [];
let sessionsRows: Session[] = [];

let onChangedCb: ((sessions: Session[]) => void) | null = null;
let onStatusCb: ((id: string, status: SessionStatus) => void) | null = null;
let onNoticeCb: ((notice: GmuxNotice) => void) | null = null;

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1440,
  gmux: {
    setSessionsPosition: () => Promise.resolve(),
    projects: {
      list: () => {
        counts.listCalls += 1;
        return failListsWith !== null
          ? Promise.reject(failListsWith)
          : Promise.resolve([{ id: 'proj-1', name: 'repo', path: '/repo' }]);
      }
    },
    sessions: {
      list: () =>
        failListsWith !== null
          ? Promise.reject(failListsWith)
          : Promise.resolve(sessionsRows),
      onChanged: (cb: (sessions: Session[]) => void) => {
        counts.onChanged += 1;
        onChangedCb = cb;
        return () => {
          counts.unsubChanged += 1;
        };
      },
      onStatusChanged: (cb: (id: string, status: SessionStatus) => void) => {
        counts.onStatusChanged += 1;
        onStatusCb = cb;
        return () => {
          counts.unsubStatus += 1;
        };
      }
    },
    scrollback: {
      onNotice: (cb: (notice: GmuxNotice) => void) => {
        counts.onNotice += 1;
        onNoticeCb = cb;
        return () => {
          counts.unsubNotice += 1;
        };
      }
    },
    notice: {
      pending: () => {
        counts.pendingCalls += 1;
        const out = pending;
        pending = [];
        return Promise.resolve(out);
      }
    },
    onActivityChanged: (
      _cb: (updates: unknown[]) => void
    ) => {
      counts.onActivityChanged += 1;
      return () => {
        counts.unsubActivity += 1;
      };
    }
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
const { appSubscriptionsActive, startAppSubscriptions } = await import(
  '../subscriptions'
);

/** Let fire-and-forget promise chains (the drain) settle. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  failListsWith = null;
  sessionsRows = [];
  useApp.setState({ toasts: [] } as never);
});

describe('first boot', () => {
  it('hydrates, subscribes every channel once, and drains the backlog once', async () => {
    pending = [{ kind: 'snapshot-repaired', sessionName: 'auth' }];
    await useApp.getState().boot();
    await settle();
    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().projects.map((p) => p.id)).toEqual(['proj-1']);
    expect(counts.onChanged).toBe(1);
    expect(counts.onStatusChanged).toBe(1);
    expect(counts.onNotice).toBe(1);
    expect(counts.onActivityChanged).toBe(1);
    expect(counts.pendingCalls).toBe(1);
    expect(appSubscriptionsActive()).toBe(true);
    const texts = useApp.getState().toasts.map((t) => t.text);
    expect(texts.join('')).toContain('came back from an earlier save');
  });
});

describe('repeated start', () => {
  it('a second boot() hydrates again and registers nothing', async () => {
    const listsBefore = counts.listCalls;
    await useApp.getState().boot();
    await settle();
    expect(counts.listCalls).toBeGreaterThan(listsBefore);
    expect(counts.onChanged).toBe(1);
    expect(counts.onStatusChanged).toBe(1);
    expect(counts.onNotice).toBe(1);
    expect(counts.onActivityChanged).toBe(1);
    expect(counts.pendingCalls).toBe(1);
  });

  it('the live handlers keep feeding the slices through the store actions', () => {
    onChangedCb?.([
      {
        id: 'sess-1',
        name: 'fix-auth',
        tmuxName: 'fix-auth',
        projectPath: '/repo',
        cwd: '/repo',
        agent: 'claude',
        status: 'running',
        createdAt: 0
      } as unknown as Session
    ]);
    expect(useApp.getState().sessions.map((s) => s.id)).toEqual(['sess-1']);
    onStatusCb?.('sess-1', 'needs_input' as SessionStatus);
    expect(useApp.getState().sessions[0]?.status).toBe('needs_input');
    expect(useApp.getState().attentionSince['sess-1']).toBeTypeOf('number');
  });
});

describe('retry after the tmux-missing block', () => {
  it('hydrates fresh state without attaching a second handler set', async () => {
    // Wreck the next hydrate the way main reports a missing tmux.
    failListsWith = new Error(
      'gmux: {"code":"TMUX_NOT_FOUND","message":"tmux is not installed","detail":"looked in PATH"}'
    );
    await useApp.getState().boot();
    expect(useApp.getState().bootBlock).toBe('tmux-missing');
    expect(useApp.getState().bootErrorDetail).toBe('looked in PATH');

    failListsWith = null;
    await useApp.getState().retryBoot();
    await settle();
    expect(useApp.getState().bootBlock).toBeNull();
    expect(useApp.getState().ready).toBe(true);
    // Still exactly ONE registration per channel across four boot calls.
    expect(counts.onChanged).toBe(1);
    expect(counts.onStatusChanged).toBe(1);
    expect(counts.onNotice).toBe(1);
    expect(counts.onActivityChanged).toBe(1);
    expect(counts.pendingCalls).toBe(1);
  });
});

describe('cleanup', () => {
  it('the disposer detaches every handler and re-arms the next start', async () => {
    // While a set is live, start returns the SAME disposer and adds nothing.
    const dispose = startAppSubscriptions(useApp);
    expect(counts.onChanged).toBe(1);

    dispose();
    expect(appSubscriptionsActive()).toBe(false);
    expect(counts.unsubChanged).toBe(1);
    expect(counts.unsubStatus).toBe(1);
    expect(counts.unsubNotice).toBe(1);
    expect(counts.unsubActivity).toBe(1);

    // The next boot attaches a fresh set and drains whatever queued since.
    pending = [{ kind: 'backup-failing' } as DurabilityNotice];
    await useApp.getState().boot();
    await settle();
    expect(counts.onChanged).toBe(2);
    expect(counts.pendingCalls).toBe(2);
    expect(
      useApp.getState().toasts.some(
        (t) => t.text === 'Session list backups are failing.'
      )
    ).toBe(true);
    // Leave the module the way the app runs: handlers attached.
    expect(appSubscriptionsActive()).toBe(true);
  });
});

describe('the notice channel still writes the sentences', () => {
  it('a live notice lands as a toast through the shared handler', () => {
    onNoticeCb?.({
      kind: 'snapshot-failed',
      sessions: 2,
      outOfSpace: false
    } as GmuxNotice);
    expect(
      useApp.getState().toasts.some(
        (t) => t.text === '2 sessions could not be saved.'
      )
    ).toBe(true);
  });
});
