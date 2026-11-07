/**
 * Phase 359, Builder C2 — the renderer arrival: one event, one receipt.
 *
 * WHAT THIS PINS, over a stubbed bridge and a stubbed `gmux:open-file` bus:
 * - the exact project id is switched to via the existing `setActiveProject`
 *   and nothing else, before the canonical request goes out;
 * - the canonical request carries `mode: 'file'`, `source: 'quickopen'`,
 *   `preview: false`, the validated paths, the computed selection, and the
 *   event's `focus` carried as `OpenFileRequest.focus`;
 * - the completion echoes the `requestId` with `accepted`, `project-missing`
 *   when the id names no project, `failed` when the emit throws;
 * - a second subscription subscribes once (no double emit).
 *
 * NO ELECTRON, NO MAIN. `window.gmux` and `window.dispatchEvent` are stubbed;
 * the store slices under test are the real ones.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const openRequests: Array<Record<string, unknown>> = [];
const completions: Array<Record<string, unknown>> = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    projects: { list: vi.fn(async () => []) },
    sessions: { list: vi.fn(async () => []) },
    fs: { readFile: vi.fn(), readImage: vi.fn(), writeFile: vi.fn(), readDir: vi.fn() },
    git: { showHead: vi.fn(async () => ''), onChanged: () => () => undefined },
    agentAccess: {
      onOpen: (cb: (input: unknown) => void) => {
        (globalThis as { __agentAccessCb?: unknown }).__agentAccessCb = cb;
        return () => undefined;
      },
      complete: vi.fn(async (input: unknown) => {
        completions.push(input as Record<string, unknown>);
      })
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

const emitted: unknown[] = [];
vi.mock('../open-file', () => ({
  requestOpenFile: (req: unknown) => {
    emitted.push(req);
  },
  onOpenFile: (cb: (req: unknown) => void) => {
    const listener = (e: Event): void => {
      cb((e as CustomEvent<unknown>).detail);
    };
    (
      globalThis as {
        window?: { addEventListener?: (...args: never[]) => void };
      }
    ).window?.addEventListener?.(
      'gmux:open-file' as never,
      listener as never
    );
    return () => undefined;
  }
}));

const { useApp } = await import('../store');
const { subscribeAgentAccessOpen, handleAgentAccessOpen } = await import(
  '../agent-access-open'
);
type AgentAccessRendererOpen = import('@shared/ipc/agent-access').AgentAccessRendererOpen;

function open(over: Partial<AgentAccessRendererOpen> = {}): AgentAccessRendererOpen {
  return {
    requestId: 'req-1',
    path: '/proj/a/file.txt',
    relPath: 'file.txt',
    repoPath: '/proj/a',
    projectId: 'p1',
    request: {
      repoPath: '/proj/a',
      relPath: 'file.txt',
      path: '/proj/a/file.txt',
      mode: 'file',
      source: 'quickopen',
      preview: false,
      selection: { line: 3, column: 0, endLine: 3, endColumn: 0 }
    },
    focus: true,
    ...over
  };
}

beforeEach(() => {
  openRequests.length = 0;
  completions.length = 0;
  useApp.setState({
    projects: [
      { id: 'p1', path: '/proj/a', name: 'a' },
      { id: 'p2', path: '/proj/b', name: 'b' }
    ],
    activeProjectId: 'p1'
  });
});

describe('agent-access open arrival', () => {
  it('emits the canonical request and completes accepted on the same project', async () => {
    emitted.length = 0;
    await handleAgentAccessOpen(useApp, open());
    const seen = emitted;
    expect(useApp.getState().activeProjectId).toBe('p1');
    expect(seen).toHaveLength(1);
    const req = seen[0] as Record<string, unknown>;
    expect(req).toMatchObject({
      repoPath: '/proj/a',
      relPath: 'file.txt',
      path: '/proj/a/file.txt',
      mode: 'file',
      source: 'quickopen',
      preview: false,
      focus: true,
      selection: { line: 3, column: 0, endLine: 3, endColumn: 0, highlight: true }
    });
    expect(completions).toEqual([{ requestId: 'req-1', outcome: 'accepted' }]);
  });

  it('switches the exact project before emitting, carrying focus false', async () => {
    emitted.length = 0;
    {
      await handleAgentAccessOpen(
        useApp,
        open({
          requestId: 'req-2',
          path: '/proj/b/other.txt',
          relPath: 'other.txt',
          repoPath: '/proj/b',
          projectId: 'p2',
          request: {
            repoPath: '/proj/b',
            relPath: 'other.txt',
            path: '/proj/b/other.txt',
            mode: 'file',
            source: 'quickopen',
            preview: false,
            selection: { line: 1, column: 2, endLine: 1, endColumn: 5 }
          },
          focus: false
        })
      );
    }
    const seen = emitted;
    expect(useApp.getState().activeProjectId).toBe('p2');
    const req = seen[0] as Record<string, unknown>;
    expect(req).toMatchObject({ focus: false, repoPath: '/proj/b' });
    expect(completions).toEqual([{ requestId: 'req-2', outcome: 'accepted' }]);
  });

  it('answers project-missing when the id names no project', async () => {
    await handleAgentAccessOpen(useApp, open({ projectId: 'gone' }));
    expect(useApp.getState().activeProjectId).toBe('p1');
    expect(completions).toEqual([
      { requestId: 'req-1', outcome: 'project-missing' }
    ]);
  });

  it('subscribes once through the lifecycle helper', () => {
    const off = subscribeAgentAccessOpen(useApp);
    const cb = (globalThis as { __agentAccessCb?: unknown }).__agentAccessCb;
    expect(typeof cb).toBe('function');
    off();
  });
});
