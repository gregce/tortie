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
const { appSubscriptionsActive, bootApp, retryBootApp, startAppSubscriptions } =
  await import('../subscriptions');

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
    await bootApp();
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
    await bootApp();
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

/**
 * PHASE 41. Three main-process codes stop the boot, and each one draws its own
 * screen. The mapping is the only place the renderer decides which of the three
 * a user sees, and every one of them also carries main's composed sentence,
 * because the version sentence holds two numbers that exist nowhere else in the
 * renderer.
 */
describe('the three boot blocks', () => {
  /** Fail the next hydrate the way main reports a classified failure. */
  function failWith(code: string, message: string, detail: string): void {
    failListsWith = new Error(
      `gmux: ${JSON.stringify({ code, message, detail })}`
    );
  }

  it('a development build with no tmux draws the tmux-missing screen', async () => {
    failWith(
      'TMUX_NOT_FOUND',
      'This is a development build, so Tortie uses the tmux on your PATH, and there is none.',
      'probed /opt/homebrew/bin, /usr/local/bin, /usr/bin and PATH'
    );
    await bootApp();
    expect(useApp.getState().bootBlock).toBe('tmux-missing');
    expect(useApp.getState().bootBlockMessage).toContain('development build');
    expect(useApp.getState().bootErrorDetail).toContain('/opt/homebrew/bin');
  });

  it('a packaged build missing its own tmux draws the broken-install screen', async () => {
    failWith(
      'TMUX_BUNDLE_INCOMPLETE',
      'Tortie is missing the program that keeps your sessions alive.',
      'the bundled tmux is not at /A/Contents/Resources/bin/tmux'
    );
    await bootApp();
    expect(useApp.getState().bootBlock).toBe('tmux-bundle-incomplete');
    expect(useApp.getState().bootBlockMessage).toContain('missing the program');
  });

  it('an untested version pair draws the version screen with both numbers', async () => {
    failWith(
      'TMUX_VERSION_UNTESTED',
      'The session server on this machine is running tmux 3.5a. Tortie runs tmux 3.7b. Tortie has not tested that pair, so it will not attach to it.',
      'server 3.5a, client 3.7b, socket gmux, client at /A/bin/tmux'
    );
    await bootApp();
    expect(useApp.getState().bootBlock).toBe('tmux-version-blocked');
    expect(useApp.getState().bootBlockMessage).toContain('3.5a');
    expect(useApp.getState().bootBlockMessage).toContain('3.7b');
    expect(useApp.getState().bootErrorDetail).toContain('socket gmux');
  });

  it('any other failure is a toast, not a block', async () => {
    // Start from a clear window. `retryBoot` is what clears a block in the
    // product, and this case is about a failure that must not RAISE one.
    useApp.setState({ bootBlock: null, bootBlockMessage: null } as never);
    failWith('GIT_FAILED', 'git said no', 'exit 128');
    await bootApp();
    expect(useApp.getState().bootBlock).toBeNull();
    expect(useApp.getState().ready).toBe(true);
    expect(useApp.getState().toasts.map((t) => t.text).join('')).toContain(
      'git said no'
    );
  });

  it('a successful boot clears the sentence as well as the block', async () => {
    failWith('TMUX_VERSION_UNTESTED', 'blocked', 'server 3.5a, client 3.7b');
    await bootApp();
    expect(useApp.getState().bootBlockMessage).toBe('blocked');
    failListsWith = null;
    await retryBootApp();
    await settle();
    expect(useApp.getState().bootBlock).toBeNull();
    expect(useApp.getState().bootBlockMessage).toBeNull();
    expect(useApp.getState().bootErrorDetail).toBeNull();
  });
});

describe('retry after the tmux-missing block', () => {
  it('hydrates fresh state without attaching a second handler set', async () => {
    // Wreck the next hydrate the way main reports a missing tmux.
    failListsWith = new Error(
      'gmux: {"code":"TMUX_NOT_FOUND","message":"tmux is not installed","detail":"looked in PATH"}'
    );
    await bootApp();
    expect(useApp.getState().bootBlock).toBe('tmux-missing');
    expect(useApp.getState().bootErrorDetail).toBe('looked in PATH');

    failListsWith = null;
    await retryBootApp();
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
    await bootApp();
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

/**
 * PHASE 109 — the machine agents answer reaches the store through the one
 * lifecycle owner: one seed read per hydrate, one push handler per handler
 * set, and an older preload without the methods changes nothing.
 */
describe('the machine agents answer (Phase 109)', () => {
  type AgentsView = import('@shared/ipc').MachineAgentsView;
  const VIEW: AgentsView = {
    machineId: 'studio',
    askedAt: 5,
    agents: [{ agentId: 'claude', presence: 'absent', path: null }]
  };
  const PUSHED: AgentsView = {
    machineId: 'studio',
    askedAt: 9,
    agents: [
      { agentId: 'claude', presence: 'present', path: '/opt/homebrew/bin/claude' }
    ]
  };

  const win = (): { gmux: Record<string, unknown> } =>
    (globalThis as unknown as { window: { gmux: Record<string, unknown> } })
      .window;

  it('a bridge without the machines surface leaves the list empty', async () => {
    // Every boot so far in this file ran without a machines key at all, so
    // this is also a statement about all of them: nothing threw, and the
    // slice still holds its initial empty list.
    expect(useApp.getState().machineAgents).toEqual([]);
  });

  it('seeds once per hydrate, subscribes once per handler set, applies pushes', async () => {
    const agentsCalls: Array<[string | null, boolean]> = [];
    let agentsSubs = 0;
    let pushCb: ((views: AgentsView[]) => void) | null = null;
    // Detach the live set so the machines bridge below is picked up by a
    // fresh subscription start rather than ignored by the idempotence rule.
    startAppSubscriptions(useApp)();
    win().gmux['machines'] = {
      state: () => Promise.resolve([]),
      onStateChanged: () => () => {},
      agents: (id: string | null, fresh: boolean) => {
        agentsCalls.push([id, fresh]);
        return Promise.resolve([VIEW]);
      },
      onAgentsChanged: (cb: (views: AgentsView[]) => void) => {
        agentsSubs += 1;
        pushCb = cb;
        return () => {};
      }
    };
    await bootApp();
    await settle();
    // The seed asks for every held view and starts nothing: fresh is false.
    expect(agentsCalls).toEqual([[null, false]]);
    expect(agentsSubs).toBe(1);
    expect(useApp.getState().machineAgents).toEqual([VIEW]);
    // Main's push replaces the whole list.
    pushCb!([PUSHED]);
    expect(useApp.getState().machineAgents).toEqual([PUSHED]);
    // A second hydrate re-seeds and registers nothing.
    await bootApp();
    await settle();
    expect(agentsCalls).toEqual([
      [null, false],
      [null, false]
    ]);
    expect(agentsSubs).toBe(1);
  });

  it('an older preload with machines but no agents method changes nothing', async () => {
    startAppSubscriptions(useApp)();
    win().gmux['machines'] = {
      state: () => Promise.resolve([]),
      onStateChanged: () => () => {}
    };
    useApp.setState({ machineAgents: [VIEW] } as never);
    await bootApp();
    await settle();
    // No method, no read, and the held list is left alone.
    expect(useApp.getState().machineAgents).toEqual([VIEW]);
  });
});
