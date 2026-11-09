/**
 * Phase 359, Builder C2 — the open broker: one typed event out, one typed
 * completion back.
 *
 * WHAT THIS FILE OWNS. Minting one request id per send, accepting a receipt
 * only from the exact `webContents` sent the event and only for a pending
 * id, and a five-second timeout after which the request reads
 * `renderer-unavailable`. A destroyed renderer, a wrong sender, or a
 * non-accepted outcome is the same closed word: the socket answers a refusal
 * and never echoes why.
 *
 * WHAT IT DOES NOT DO. Compose the request (that is `open.ts`), subscribe
 * the renderer (that is `agent-access-open.ts`), or log a byte of the file:
 * a receipt carries an outcome and an id, never a path.
 */

import type { WebContents } from 'electron';
import {
  EVT_AGENT_ACCESS_NAV,
  EVT_AGENT_ACCESS_OPEN,
  type AgentAccessNavCompletion,
  type AgentAccessOpenCompletion,
  type AgentAccessRendererNav,
  type AgentAccessRendererOpen
} from '@shared/ipc/agent-access';
// The one typed main→renderer sender. The domain joined `AllEventPayloadMap`
// in the same commit that installed the member, so this is the plain call.
import { sendEvent } from '../typed-events';

/** How long the renderer has to answer before the request reads refused. */
export const AGENT_ACCESS_OPEN_TIMEOUT_MS = 5_000;

/** The receipt a send waits on. Null means refused (see header). */
export type AgentAccessOpenReceipt = AgentAccessOpenCompletion | null;

interface PendingNav {
  requestId: string;
  target: WebContents;
  resolve: (receipt: AgentAccessNavReceipt | null) => void;
  timer: NodeJS.Timeout;
}

/** One navigation receipt, or null when the renderer never answered. */
export type AgentAccessNavReceipt = AgentAccessNavCompletion;

interface PendingOpen {
  requestId: string;
  target: WebContents;
  resolve: (receipt: AgentAccessOpenReceipt) => void;
  timer: NodeJS.Timeout;
}

/**
 * One broker per service install. The integrator registers the
 * `agent-access:openComplete` handler against `noteCompletion` once.
 */
export class AgentAccessOpenBroker {
  private pending = new Map<string, PendingOpen>();
  private navPending = new Map<string, PendingNav>();
  private counter = 0;
  private navCounter = 0;

  /** Mint the next request id. Deterministic per broker, unique per send. */
  mintRequestId(): string {
    this.counter += 1;
    return `agent-access-open-${this.counter}`;
  }

  /**
   * Send one typed event to the exact target and wait for its completion.
   * Never shows, focuses, restores, moves, or activates anything: the one
   * `send` below is the only IPC this method performs.
   */
  send(
    target: WebContents,
    payload: AgentAccessRendererOpen
  ): Promise<AgentAccessOpenReceipt> {
    return new Promise<AgentAccessOpenReceipt>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(payload.requestId);
        resolve(null);
      }, AGENT_ACCESS_OPEN_TIMEOUT_MS);
      if (typeof timer.unref === 'function') timer.unref();
      this.pending.set(payload.requestId, {
        requestId: payload.requestId,
        target,
        resolve,
        timer
      });
      try {
        sendEvent(target, EVT_AGENT_ACCESS_OPEN, payload);
      } catch {
        clearTimeout(timer);
        this.pending.delete(payload.requestId);
        resolve(null);
      }
    });
  }

  /** PHASE 362. Mint the next navigation id, distinct from an open's. */
  mintNavRequestId(): string {
    this.navCounter += 1;
    return `agent-access-nav-${this.navCounter}`;
  }

  /**
   * PHASE 362. Send one navigation and wait for its receipt. The same
   * five-second ceiling as an open: a renderer that never answers is
   * `renderer-unavailable`, and nothing is retried.
   */
  sendNav(
    target: WebContents,
    payload: AgentAccessRendererNav
  ): Promise<AgentAccessNavReceipt | null> {
    return new Promise<AgentAccessNavReceipt | null>((resolve) => {
      const timer = setTimeout(() => {
        this.navPending.delete(payload.requestId);
        resolve(null);
      }, AGENT_ACCESS_OPEN_TIMEOUT_MS);
      if (typeof timer.unref === 'function') timer.unref();
      this.navPending.set(payload.requestId, {
        requestId: payload.requestId,
        target,
        resolve,
        timer
      });
      try {
        sendEvent(target, EVT_AGENT_ACCESS_NAV, payload);
      } catch {
        clearTimeout(timer);
        this.navPending.delete(payload.requestId);
        resolve(null);
      }
    });
  }

  /**
   * PHASE 362. The `agent-access:navComplete` handler calls this. Same
   * acceptance rule as an open receipt: the exact sender, a pending id.
   */
  noteNavCompletion(
    sender: WebContents,
    completion: AgentAccessNavCompletion
  ): void {
    const pending = this.navPending.get(completion.requestId);
    if (pending === undefined) return;
    if (pending.target !== sender) return;
    if (sender.isDestroyed()) return;
    clearTimeout(pending.timer);
    this.navPending.delete(completion.requestId);
    pending.resolve(completion);
  }

  /**
   * The `agent-access:openComplete` handler calls this with the sender and
   * the receipt. A receipt is accepted only from the exact `webContents`
   * sent the event and only for a pending id; anything else is ignored and
   * the pending send still times out.
   */
  noteCompletion(
    sender: WebContents,
    completion: AgentAccessOpenCompletion
  ): void {
    const pending = this.pending.get(completion.requestId);
    if (pending === undefined) return;
    if (pending.target !== sender) return;
    if (sender.isDestroyed()) return;
    clearTimeout(pending.timer);
    this.pending.delete(completion.requestId);
    pending.resolve(completion);
  }

  /** Drop every pending send. The disposer calls this on shutdown. */
  clear(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.resolve(null);
    }
    this.pending.clear();
    for (const pending of this.navPending.values()) {
      clearTimeout(pending.timer);
      pending.resolve(null);
    }
    this.navPending.clear();
  }

  /** How many sends are still waiting. Tests only. */
  pendingCount(): number {
    return this.pending.size + this.navPending.size;
  }
}

/**
 * Deliver one payload through the broker. Small seam so `open.ts` never
 * touches the send primitive.
 */
export function deliverAgentAccessOpen(
  broker: AgentAccessOpenBroker,
  target: WebContents,
  payload: AgentAccessRendererOpen
): Promise<AgentAccessOpenReceipt> {
  return broker.send(target, payload);
}
