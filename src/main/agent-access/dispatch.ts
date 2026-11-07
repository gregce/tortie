/**
 * Phase 359, Builder C1 — the one dispatcher for the agent-access socket.
 *
 * WHAT THIS FILE OWNS. JSON validation against the shared contract, the two
 * enabled checks, the closed operation registry, and the single per-request
 * log line. `socket.ts` frames; `facts.ts` projects; Builder C2's open
 * operation arrives only as the injected {@link AgentAccessOpenHandler}.
 * This file never chooses filesystem or UI policy.
 *
 * THE ORDER, and every refusal ends the request:
 * 1. parse the framed line (unparseable is `bad-request`);
 * 2. check the sealed switch (off is `disabled`, before lookup);
 * 3. look the operation up in the exhaustive registry (absent is
 *    `unknown-operation`);
 * 4. validate the body against the closed union (anything else is
 *    `bad-request`: unknown members, a wrong locator shape, malformed
 *    Base64, NUL, over-bound bytes, out-of-range lines);
 * 5. check the sealed switch again before running the handler or returning
 *    a value (moved off while validating is `disabled`, nothing runs);
 * 6. run the handler; a caller that is fake, gone, or remote reads
 *    `unavailable` and reaches no operation.
 *
 * No response echoes the raw request, find text, or rejected bytes: every
 * error message below is a fixed sentence.
 */

import {
  AGENT_ACCESS_OPERATIONS,
  isAgentAccessSessionId,
  type AgentAccessErrorCode,
  type AgentAccessOpenHandler,
  type AgentAccessOpenInvocation,
  type AgentAccessOperation,
  type AgentAccessResponse
} from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import {
  buildAgentAccessCapabilities,
  buildAgentAccessSessions,
  buildAgentAccessWhoAmI,
  type AgentAccessFactSources
} from './facts';

/** Fixed sentences. Nothing request-shaped ever rides one. */
const DISABLED_MESSAGE =
  'Agent access is off. Turn it on in Settings → Agents to let sessions use Tortie.';
const UNKNOWN_OPERATION_MESSAGE = 'Unknown operation.';
const BAD_REQUEST_MESSAGE = 'Malformed request.';
const UNAVAILABLE_MESSAGE = 'Unknown or unavailable session.';

/** Largest decoded open path/find, in bytes. Read from the shared contract. */
const MAX_PATH_BYTES = 4_096;
const MAX_FIND_BYTES = 4_096;

/** Inclusive line bounds from the shared contract. */
const MIN_LINE = 1;
const MAX_LINE = 10_000_000;

function fail(code: AgentAccessErrorCode, message: string): AgentAccessResponse {
  return { version: 1, ok: false, error: { code, message } };
}

function decodeCanonicalBase64(
  input: unknown,
  maxBytes: number
): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  if (input.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input)) return null;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(input, 'base64');
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length > maxBytes) return null;
  // Canonical: the standard encoding of the decoded bytes must be the input
  // itself, so padded-but-wrong and non-canonical spellings refuse.
  if (bytes.toString('base64') !== input) return null;
  // NUL: a path or find string carrying one is refused, never truncated.
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function isLineNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_LINE &&
    value <= MAX_LINE
  );
}

/** The validated open locator, decoded but otherwise unvalidated here. */
type OpenLocator =
  | { kind: 'line'; pathBase64: string; line: number; endLine?: number }
  | { kind: 'find'; pathBase64: string; findBase64: string };

/**
 * Validate the body of an `open` request. Unknown members, a second locator,
 * a missing locator, a malformed path/find, or an out-of-range line all read
 * null, and the request is refused `bad-request`.
 */
export function validateOpenBody(body: Record<string, unknown>): {
  session: string;
  invocation: AgentAccessOpenInvocation;
} | null {
  const session = body['session'];
  if (!isAgentAccessSessionId(session)) return null;
  const allowed = new Set([
    'version',
    'operation',
    'session',
    'pathBase64',
    'line',
    'endLine',
    'findBase64'
  ]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) return null;
  }
  const pathBase64 = body['pathBase64'];
  if (decodeCanonicalBase64(pathBase64, MAX_PATH_BYTES) === null) return null;
  if (typeof pathBase64 !== 'string') return null;
  const hasLine = body['line'] !== undefined || body['endLine'] !== undefined;
  const hasFind = body['findBase64'] !== undefined;
  // The two locator shapes are mutually exclusive and exhaustive.
  if (hasLine === hasFind) return null;
  let locator: OpenLocator;
  if (hasFind) {
    const findBase64 = body['findBase64'];
    if (decodeCanonicalBase64(findBase64, MAX_FIND_BYTES) === null) {
      return null;
    }
    if (typeof findBase64 !== 'string') return null;
    locator = { kind: 'find', pathBase64, findBase64 };
  } else {
    const line = body['line'];
    if (!isLineNumber(line)) return null;
    const endLine = body['endLine'];
    if (endLine !== undefined) {
      if (!isLineNumber(endLine) || endLine < line) return null;
      locator = { kind: 'line', pathBase64, line, endLine };
    } else {
      locator = { kind: 'line', pathBase64, line };
    }
  }
  const invocation: AgentAccessOpenInvocation = { session, pathBase64 };
  if (locator.kind === 'line') {
    invocation.line = locator.line;
    if (locator.endLine !== undefined) invocation.endLine = locator.endLine;
  } else {
    invocation.findBase64 = locator.findBase64;
  }
  return { session, invocation };
}

/** What the dispatcher needs from the app. Nothing here starts anything. */
export interface AgentAccessDispatchDeps {
  /** The current sealed switch. Asked twice per request. */
  isEnabled: () => boolean;
  /** The app's current session list. Async: a sync list would pin a stale core. */
  listSessions: () => Promise<Session[]>;
  /** The app's current project rows. Async: a sync list would pin a stale core. */
  listProjects: () => Promise<Project[]>;
  /** `app.getVersion()`, read in the service and handed in. */
  tortieVersion: () => string;
  /** Builder C2's open operation. The dispatcher's only open seam. */
  open: AgentAccessOpenHandler;
  /** One structured line per completed/refused request. */
  report: (entry: {
    operation: AgentAccessOperation | 'unknown';
    outcome: string;
    durationMs: number;
  }) => void;
}

/** A handler behind the exhaustive operation registry. */
type OperationHandler = (
  deps: AgentAccessDispatchDeps,
  sources: AgentAccessFactSources,
  callerId: string,
  invocation: AgentAccessOpenInvocation | null
) => Promise<AgentAccessResponse>;

const OPERATION_HANDLERS: Record<AgentAccessOperation, OperationHandler> = {
  capabilities: async (deps, sources, callerId) => {
    const whoami = buildAgentAccessWhoAmI(sources, callerId);
    if (whoami === null) return fail('unavailable', UNAVAILABLE_MESSAGE);
    return {
      version: 1,
      ok: true,
      operation: 'capabilities',
      value: buildAgentAccessCapabilities(deps.tortieVersion())
    };
  },
  whoami: async (_deps, sources, callerId) => {
    const whoami = buildAgentAccessWhoAmI(sources, callerId);
    if (whoami === null) return fail('unavailable', UNAVAILABLE_MESSAGE);
    return { version: 1, ok: true, operation: 'whoami', value: whoami };
  },
  sessions: async (_deps, sources, callerId) => {
    const sessions = buildAgentAccessSessions(sources, callerId);
    if (sessions === null) return fail('unavailable', UNAVAILABLE_MESSAGE);
    return { version: 1, ok: true, operation: 'sessions', value: sessions };
  },
  open: async (deps, _sources, _callerId, invocation) => {
    if (invocation === null) return fail('bad-request', BAD_REQUEST_MESSAGE);
    const value = await deps.open(invocation);
    return { version: 1, ok: true, operation: 'open', value };
  }
} satisfies Record<AgentAccessOperation, OperationHandler>;

/** The outcome word the single log line carries for one response. */
export function outcomeOfResponse(
  response: AgentAccessResponse
): string {
  if (!response.ok) return response.error.code;
  if (response.operation !== 'open') return 'ok';
  const value = response.value as import('@shared/agent-access').AgentAccessOpenValue;
  if (value.state === 'opened') return 'opened';
  if (value.state === 'not-found') return 'not-found';
  return value.reason;
}

/**
 * Dispatch one framed request line and answer one closed response.
 *
 * The switch is asked before the operation lookup and again before the
 * handler runs or a value returns, so a switch that moved off mid-request
 * answers `disabled` and runs nothing. The single report line carries only
 * the closed operation, the outcome word, and the duration: never a session
 * id, path, find text, response body, or error message.
 */
export async function dispatchAgentAccessRequest(
  line: string,
  deps: AgentAccessDispatchDeps
): Promise<AgentAccessResponse> {
  const startedAt = Date.now();
  let operation: AgentAccessOperation | 'unknown' = 'unknown';
  let response: AgentAccessResponse | null = null;
  try {
    let body: unknown;
    try {
      body = JSON.parse(line);
    } catch {
      response = fail('bad-request', BAD_REQUEST_MESSAGE);
      return response;
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      response = fail('bad-request', BAD_REQUEST_MESSAGE);
      return response;
    }
    const record = body as Record<string, unknown>;
    if (record['version'] !== 1) {
      response = fail('bad-request', BAD_REQUEST_MESSAGE);
      return response;
    }
    // First enabled check: before the lookup.
    if (!deps.isEnabled()) {
      response = fail('disabled', DISABLED_MESSAGE);
      return response;
    }
    const asked = record['operation'];
    if (
      typeof asked !== 'string' ||
      !(AGENT_ACCESS_OPERATIONS as readonly string[]).includes(asked)
    ) {
      response = fail('unknown-operation', UNKNOWN_OPERATION_MESSAGE);
      return response;
    }
    operation = asked as AgentAccessOperation;
    if (operation !== 'open') {
      const allowed = new Set(['version', 'operation', 'session']);
      for (const key of Object.keys(record)) {
        if (!allowed.has(key)) {
          response = fail('bad-request', BAD_REQUEST_MESSAGE);
          return response;
        }
      }
      if (!isAgentAccessSessionId(record['session'])) {
        response = fail('bad-request', BAD_REQUEST_MESSAGE);
        return response;
      }
    }
    let invocation: AgentAccessOpenInvocation | null = null;
    let callerId: string;
    if (operation === 'open') {
      const validated = validateOpenBody(record);
      if (validated === null) {
        response = fail('bad-request', BAD_REQUEST_MESSAGE);
        return response;
      }
      callerId = validated.session;
      invocation = validated.invocation;
    } else {
      callerId = record['session'] as string;
    }
    // Second enabled check: before the handler runs or a value returns.
    if (!deps.isEnabled()) {
      response = fail('disabled', DISABLED_MESSAGE);
      return response;
    }
    const sources: AgentAccessFactSources = {
      sessions: await deps.listSessions(),
      projects: await deps.listProjects()
    };
    response = await OPERATION_HANDLERS[operation](
      deps,
      sources,
      callerId,
      invocation
    );
    return response;
  } finally {
    // One line per completed/refused request, whatever happened.
    //
    // PHASE 359, FIX ROUND. The independent live verifier proved this block
    // could destroy the answer it was reporting: when the try body threw
    // before assigning `response`, `outcomeOfResponse(undefined)` threw a
    // TypeError inside the finally, which replaced the handler's own reason
    // with a generic `unavailable` and logged `operation:"unknown"`. A report
    // is not allowed to be the reason a request fails, so the unassigned case
    // is answered as itself and `report` cannot throw out of here.
    try {
      if (response === null) {
        deps.report({
          operation,
          outcome: 'threw',
          durationMs: Math.max(0, Date.now() - startedAt)
        });
      } else {
        deps.report({
          operation,
          outcome: outcomeOfResponse(response),
          durationMs: Math.max(0, Date.now() - startedAt)
        });
      }
    } catch {
      // A reporter that throws must never change the request's outcome.
    }
  }
}
