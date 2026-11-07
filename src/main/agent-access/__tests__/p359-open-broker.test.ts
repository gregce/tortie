/**
 * Phase 359, Builder C2 — the open broker: five sends, five waits.
 *
 * WHAT THIS PINS. One request id minted per send, pending only the sends
 * waiting, a receipt accepted only from the exact `webContents` sent the
 * event and only for a pending id, the five-second timeout reading refused,
 * a destroyed renderer or a wrong sender ignored, a non-accepted outcome
 * refused, `clear` dropping every wait.
 *
 * NO ELECTRON. The `WebContents` is a structural stub: identity (`!==`) and
 * `isDestroyed()` are the only questions the broker asks it.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AgentAccessOpenBroker,
  AGENT_ACCESS_OPEN_TIMEOUT_MS
} from '../open-broker';
import { EVT_AGENT_ACCESS_OPEN } from '@shared/ipc/agent-access';
import type { WebContents } from 'electron';

function webContents(destroyed = false): {
  target: WebContents;
  sent: Array<{ channel: string; payload: unknown }>;
} {
  const sent: Array<{ channel: string; payload: unknown }> = [];
  const target = {
    isDestroyed: () => destroyed,
    send: (channel: string, payload: unknown) => {
      sent.push({ channel, payload });
    }
  } as unknown as WebContents;
  return { target, sent };
}

function payload(requestId: string): Parameters<AgentAccessOpenBroker['send']>[1] {
  return {
    requestId,
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
    focus: true
  };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('AgentAccessOpenBroker', () => {
  it('mints one id per send and sends the typed event once', async () => {
    const broker = new AgentAccessOpenBroker();
    const { target, sent } = webContents();
    const id = broker.mintRequestId();
    const waiting = broker.send(target, payload(id));
    expect(sent).toHaveLength(1);
    expect(sent[0]?.channel).toBe(EVT_AGENT_ACCESS_OPEN);
    expect(
      (sent[0]?.payload as ReturnType<typeof payload>).requestId
    ).toBe(id);
    expect(broker.pendingCount()).toBe(1);
    broker.noteCompletion(target, { requestId: id, outcome: 'accepted' });
    await expect(waiting).resolves.toEqual({
      requestId: id,
      outcome: 'accepted'
    });
    expect(broker.pendingCount()).toBe(0);
  });

  it('ignores a completion from the wrong sender', async () => {
    const broker = new AgentAccessOpenBroker();
    const { target } = webContents();
    const { target: stranger } = webContents();
    const id = broker.mintRequestId();
    const waiting = broker.send(target, payload(id));
    broker.noteCompletion(stranger, { requestId: id, outcome: 'accepted' });
    expect(broker.pendingCount()).toBe(1);
    broker.noteCompletion(target, { requestId: id, outcome: 'accepted' });
    await expect(waiting).resolves.toEqual({
      requestId: id,
      outcome: 'accepted'
    });
  });

  it('ignores a completion for an unknown id and for a destroyed renderer', async () => {
    const broker = new AgentAccessOpenBroker();
    const { target } = webContents();
    const id = broker.mintRequestId();
    const waiting = broker.send(target, payload(id));
    broker.noteCompletion(target, { requestId: 'nope', outcome: 'accepted' });
    expect(broker.pendingCount()).toBe(1);
    // A destroyed exact sender is still not a receipt: the wait stands
    // until the timeout or the real answer.
    const destroyed = {
      isDestroyed: () => true,
      send: () => undefined
    } as unknown as WebContents;
    broker.noteCompletion(destroyed, { requestId: id, outcome: 'accepted' });
    expect(broker.pendingCount()).toBe(1);
    broker.noteCompletion(target, { requestId: id, outcome: 'failed' });
    await expect(waiting).resolves.toEqual({
      requestId: id,
      outcome: 'failed'
    });
  });

  it('times out after five seconds with no answer', async () => {
    vi.useFakeTimers();
    try {
      const broker = new AgentAccessOpenBroker();
      const { target } = webContents();
      const id = broker.mintRequestId();
      const waiting = broker.send(target, payload(id));
      expect(broker.pendingCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(AGENT_ACCESS_OPEN_TIMEOUT_MS + 50);
      await expect(waiting).resolves.toBeNull();
      expect(broker.pendingCount()).toBe(0);
      // A late answer after the timeout moves nothing.
      broker.noteCompletion(target, { requestId: id, outcome: 'accepted' });
      expect(broker.pendingCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops every pending send on clear', async () => {
    const broker = new AgentAccessOpenBroker();
    const { target } = webContents();
    const first = broker.send(target, payload(broker.mintRequestId()));
    const second = broker.send(target, payload(broker.mintRequestId()));
    expect(broker.pendingCount()).toBe(2);
    broker.clear();
    expect(broker.pendingCount()).toBe(0);
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toBeNull();
  });
});
