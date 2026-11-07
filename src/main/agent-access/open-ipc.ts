/**
 * Phase 359, Builder C2 — the main-side registrar for the renderer→main
 * completion.
 *
 * ONE registration: `agent-access:openComplete` through the typed `handle`,
 * forwarding the sender and the receipt to the broker's `noteCompletion`.
 * Shape-checked here, decided there: an unknown body is ignored and the
 * pending send still times out to `renderer-unavailable`.
 */

import type { IpcMain } from 'electron';
import type { AgentAccessOpenCompletion } from '@shared/ipc/agent-access';
// The one typed invoke registrar: the domain joined `GmuxInvokeChannelMap` in
// the same commit that installed the member, so the channel's request and
// response are checked at both ends and the trusted-sender check applies.
import { handle } from '../typed-ipc';
import type { AgentAccessOpenBroker } from './open-broker';

/** Outcomes the wire may carry. Anything else is not a completion. */
const COMPLETION_OUTCOMES: ReadonlySet<string> = new Set([
  'accepted',
  'project-missing',
  'failed'
]);

function isCompletion(value: unknown): value is AgentAccessOpenCompletion {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record['requestId'] !== 'string') return false;
  if ((record['requestId'] as string).length === 0) return false;
  const outcome = record['outcome'];
  if (typeof outcome !== 'string' || !COMPLETION_OUTCOMES.has(outcome)) {
    return false;
  }
  const keys = new Set(Object.keys(record));
  if (keys.size !== 2 || !keys.has('requestId') || !keys.has('outcome')) {
    return false;
  }
  return true;
}

/**
 * Register the completion channel against one broker. Call once per
 * main-process install; the integrator owns the call site.
 */
export function registerAgentAccessOpenIpc(
  ipc: IpcMain,
  broker: AgentAccessOpenBroker
): void {
  handle(ipc, 'agent-access:openComplete', (event, input) => {
    if (!isCompletion(input)) return;
    broker.noteCompletion(event.sender, input);
  });
}
