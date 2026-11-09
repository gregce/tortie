/**
 * Phase 359, Builder C1 — dispatch validation and the double enabled check.
 *
 * WHAT THIS PINS. The JSON body rules from the shared contract (unknown
 * members refuse, the two open locator shapes exclude each other, canonical
 * Base64 with NUL and bound refusals, line bounds and `endLine >= line`),
 * the closed operation registry with its exact transport codes, the switch
 * asked before lookup and again before the handler runs, the caller rule
 * (fake/gone/remote read `unavailable` and reach no handler), and the single
 * payload-free report line.
 *
 * THE OPEN HANDLER IS A STUB HERE. C1 imports only the injected
 * `AgentAccessOpenHandler` type. A `vi.fn()` records what the dispatcher
 * handed C2's seam; it chooses no filesystem or UI policy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AgentAccessOpenHandler,
  AgentAccessResponse
} from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import {
  dispatchAgentAccessRequest,
  type AgentAccessDispatchDeps
} from '../dispatch';

function session(over: Partial<Session> & { id: string }): Session {
  return {
    name: `name-${over.id}`,
    tmuxName: `tmux-${over.id}`,
    projectPath: '/proj/a',
    cwd: '/proj/a',
    agent: 'claude',
    status: 'running',
    createdAt: 1000,
    ...over
  };
}

const PROJECTS: Project[] = [{ id: 'p1', path: '/proj/a', name: 'a' }];

const openOk: AgentAccessOpenHandler = async () => ({
  state: 'opened',
  project: { id: 'p1', name: 'a', path: '/proj/a' },
  path: '/proj/a/file.txt',
  selection: {
    line: 3,
    column: 0,
    endLine: 3,
    endColumn: 0,
    highlight: true
  }
});

function deps(over: Partial<AgentAccessDispatchDeps> = {}): {
  deps: AgentAccessDispatchDeps;
  report: ReturnType<typeof vi.fn>;
  open: AgentAccessOpenHandler;
} {
  const report = vi.fn();
  const open = over.open ?? openOk;
  return {
    deps: {
      isEnabled: () => true,
      listSessions: async () => [session({ id: 'caller-1' })],
      listProjects: async () => PROJECTS,
      tortieVersion: () => '9.9.9-test',
      open,
      // PHASE 362. The acting half's seams. Each answers a refusal here, so
      // this file keeps proving dispatch's own rules and reaches no verb.
      openProject: async () => ({ state: 'refused', reason: 'project-missing' }),
      create: async () => ({ state: 'refused', reason: 'failed' }),
      rename: async () => ({ state: 'refused', reason: 'failed' }),
      focus: async () => ({ state: 'refused', reason: 'renderer-unavailable' }),
      readSummary: () => null,
      report,
      ...over
    },
    report,
    open
  };
}

function lineOf(body: unknown): string {
  return `${JSON.stringify(body)}\n`;
}

function b64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

describe('agent-access dispatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('answers capabilities/whoami/sessions for a live local caller', async () => {
    const { deps: d } = deps();
    const capabilities = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'capabilities', session: 'caller-1' }),
      d
    );
    expect(capabilities.ok).toBe(true);
    const whoami = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'whoami', session: 'caller-1' }),
      d
    );
    expect(whoami).toEqual({
      version: 1,
      ok: true,
      operation: 'whoami',
      value: {
        session: expect.objectContaining({ id: 'caller-1' })
      }
    });
    const sessions = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'sessions', session: 'caller-1' }),
      d
    );
    expect(sessions.ok).toBe(true);
  });

  it('accepts reordered keys and split framing is the socket layer’s job', async () => {
    const { deps: d } = deps();
    const response = await dispatchAgentAccessRequest(
      lineOf({ session: 'caller-1', operation: 'whoami', version: 1 }),
      d
    );
    expect(response.ok).toBe(true);
  });

  it('checks the switch before lookup and again before the handler', async () => {
    const { deps: d } = deps({ isEnabled: () => false });
    const disabled = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'sessions', session: 'caller-1' }),
      d
    );
    expect(disabled).toEqual({
      version: 1,
      ok: false,
      error: {
        code: 'disabled',
        message: expect.any(String)
      }
    });

    // A switch that moves off between lookup and the handler still answers
    // disabled and the handler never runs.
    const open = vi.fn(openOk);
    let calls = 0;
    const moving = deps({
      open,
      isEnabled: () => {
        calls += 1;
        return calls < 2;
      }
    });
    const moved = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 3
      }),
      moving.deps
    );
    expect(moved).toEqual({
      version: 1,
      ok: false,
      error: { code: 'disabled', message: expect.any(String) }
    });
    expect(open).not.toHaveBeenCalled();
  });

  it('reads absent operations as unknown-operation and junk as bad-request', async () => {
    const { deps: d } = deps();
    const unknownOp = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'restart', session: 'caller-1' }),
      d
    );
    expect(unknownOp).toEqual({
      version: 1,
      ok: false,
      error: { code: 'unknown-operation', message: expect.any(String) }
    });
    expect(unknownOp).not.toEqual(
      expect.objectContaining({ error: expect.objectContaining({ code: 'bad-request' }) })
    );
    for (const bad of [
      'not json\n',
      '\n',
      lineOf({ version: 2, operation: 'whoami', session: 'caller-1' }),
      lineOf({ version: 1, operation: 'whoami', session: 'caller-1', extra: 1 }),
      lineOf({ version: 1, operation: 'whoami', session: 'no such id!!' }),
      lineOf({ version: 1, operation: 'whoami', session: '' })
    ]) {
      const response = await dispatchAgentAccessRequest(bad, d);
      expect(response).toEqual({
        version: 1,
        ok: false,
        error: { code: 'bad-request', message: expect.any(String) }
      });
    }
  });

  it('refuses fake, gone, and remote callers as unavailable', async () => {
    const { deps: d } = deps({
      listSessions: async () => [
        session({ id: 'here' }),
        session({
          id: 'far',
          machine: {
            id: 'mac-pro',
            label: 'Mac Pro',
            color: 'blue',
            answering: true,
            canRestore: false,
            restoreReason: null
          }
        })
      ]
    });
    for (const callerId of ['missing', 'far']) {
      const whoami = await dispatchAgentAccessRequest(
        lineOf({ version: 1, operation: 'whoami', session: callerId }),
        d
      );
      expect(whoami).toEqual({
        version: 1,
        ok: false,
        error: { code: 'unavailable', message: expect.any(String) }
      });
      const capabilities = await dispatchAgentAccessRequest(
        lineOf({ version: 1, operation: 'capabilities', session: callerId }),
        d
      );
      expect(capabilities).toEqual({
        version: 1,
        ok: false,
        error: { code: 'unavailable', message: expect.any(String) }
      });
    }
  });

  it.each(['expired', 'disabled'] as const)(
    'does not start a handler when %s during asynchronous source reads',
    async (reason) => {
      let enabled = true;
      let live = true;
      const open = vi.fn(openOk);
      const { deps: d, report } = deps({
        open,
        isEnabled: () => enabled,
        isLive: () => live,
        listProjects: async () => {
          // The request was admitted, but its transport or switch changed
          // while fetching sources. No operation may start afterwards.
          if (reason === 'expired') live = false;
          else enabled = false;
          return PROJECTS;
        }
      });
      const result = await dispatchAgentAccessRequest(lineOf({
        version: 1, operation: 'open', session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'), line: 3
      }), d);
      expect(result).toMatchObject({
        ok: false,
        error: { code: reason === 'expired' ? 'unavailable' : 'disabled' }
      });
      expect(open).not.toHaveBeenCalled();
      expect(report).toHaveBeenCalledTimes(1);
    }
  );

  it('validates the two open locator shapes and nothing else', async () => {
    const { deps: d } = deps();
    const openLine = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 3,
        endLine: 5
      }),
      d
    );
    expect(openLine.ok).toBe(true);
    const openFind = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        findBase64: b64('needle')
      }),
      d
    );
    expect(openFind.ok).toBe(true);

    const badBodies: unknown[] = [
      // Both locators at once, and neither.
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 3,
        findBase64: b64('needle')
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt')
      },
      // Unknown member beside a valid locator.
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 3,
        extra: true
      },
      // Non-canonical and malformed Base64, empty find, NUL path.
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: '!!!not-base64!!!',
        line: 3
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        findBase64: b64('')
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: Buffer.from('a\0b', 'utf8').toString('base64'),
        line: 3
      },
      // Out-of-range lines and endLine before line.
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 0
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 10_000_001
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        line: 5,
        endLine: 3
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('/proj/a/file.txt'),
        endLine: 5
      },
      {
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64: b64('AGENTS.md'),
        line: 1
      }
    ];
    for (const body of badBodies) {
      const response: AgentAccessResponse = await dispatchAgentAccessRequest(
        lineOf(body),
        d
      );
      expect(response).toEqual({
        version: 1,
        ok: false,
        error: { code: 'bad-request', message: expect.any(String) }
      });
      expect(JSON.stringify(response)).not.toContain('needle');
    }
  });

  it('forwards the open invocation decoded and passes refusals through', async () => {
    const open = vi.fn(openOk);
    const { deps: d } = deps({ open });
    const pathBase64 = b64('/proj/a/file.txt');
    const response = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64,
        line: 3
      }),
      d
    );
    expect(response.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith({
      session: 'caller-1',
      pathBase64,
      line: 3
    });

    const refused = vi.fn(async () => ({
      state: 'refused' as const,
      reason: 'missing' as const
    }));
    const { deps: refusedDeps } = deps({ open: refused });
    const refusedResponse = await dispatchAgentAccessRequest(
      lineOf({
        version: 1,
        operation: 'open',
        session: 'caller-1',
        pathBase64,
        findBase64: b64('needle')
      }),
      refusedDeps
    );
    expect(refusedResponse).toEqual({
      version: 1,
      ok: true,
      operation: 'open',
      value: { state: 'refused', reason: 'missing' }
    });
  });

  it('logs one payload-free line per request', async () => {
    const { deps: d, report } = deps();
    const response = await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'sessions', session: 'caller-1' }),
      d
    );
    expect(response.ok).toBe(true);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({
      operation: 'sessions',
      outcome: 'ok',
      durationMs: expect.any(Number)
    });
    const logged = JSON.stringify(report.mock.calls);
    expect(logged).not.toContain('caller-1');

    const { deps: failing, report: failingReport } = deps({ isEnabled: () => false });
    await dispatchAgentAccessRequest(
      lineOf({ version: 1, operation: 'whoami', session: 'caller-1' }),
      failing
    );
    expect(failingReport).toHaveBeenCalledWith({
      operation: 'unknown',
      outcome: 'disabled',
      durationMs: expect.any(Number)
    });
  });
});
