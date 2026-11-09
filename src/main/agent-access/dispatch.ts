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
 * 2. check the plain switch (off is `disabled`, before lookup);
 * 3. look the operation up in the exhaustive registry (absent is
 *    `unknown-operation`);
 * 4. validate the body against the closed union (anything else is
 *    `bad-request`: unknown members, a wrong locator shape, malformed
 *    Base64, NUL, over-bound bytes, out-of-range lines);
 * 5. check the plain switch again before running the handler or returning
 *    a value (moved off while validating is `disabled`, nothing runs);
 * 6. run the handler; a caller that is fake, gone, or remote reads
 *    `unavailable` and reaches no operation.
 *
 * No response echoes the raw request, find text, or rejected bytes: every
 * error message below is a fixed sentence.
 */

import {
  AGENT_ACCESS_MAX_LISTED_ROWS,
  AGENT_ACCESS_OPERATIONS,
  isAgentAccessSessionId,
  type AgentAccessCreateHandler,
  type AgentAccessErrorCode,
  type AgentAccessFocusHandler,
  type AgentAccessOpenHandler,
  type AgentAccessOpenInvocation,
  type AgentAccessOpenProjectHandler,
  type AgentAccessOperation,
  type AgentAccessRenameHandler,
  type AgentAccessResponse
} from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import {
  buildAgentAccessActivity,
  buildAgentAccessCapabilities,
  buildAgentAccessSessions,
  buildAgentAccessSummaries,
  buildAgentAccessWhoAmI,
  findLocalCaller,
  type AgentAccessFactSources,
  type AgentAccessStoredSummary
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
  // Absolute only: a relative or empty path is malformed, never guessed.
  if (!decodeCanonicalBase64(pathBase64, MAX_PATH_BYTES)?.startsWith('/')) return null;
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
  /** The current plain boolean switch. Asked twice per request. */
  isEnabled: () => boolean;
  /** The app's current session list. Async: a sync list would pin a stale core. */
  listSessions: () => Promise<Session[]>;
  /** The app's current project rows. Async: a sync list would pin a stale core. */
  listProjects: () => Promise<Project[]>;
  /** `app.getVersion()`, read in the service and handed in. */
  tortieVersion: () => string;
  /** Builder C2's open operation. The dispatcher's only open seam. */
  open: AgentAccessOpenHandler;
  /** PHASE 362. The project's tab in front. Injected: no policy here. */
  openProject: AgentAccessOpenProjectHandler;
  /** PHASE 362. A named session through the app's one create path. */
  create: AgentAccessCreateHandler;
  /** PHASE 362. A rename by id, through the app's one rename verb. */
  rename: AgentAccessRenameHandler;
  /** PHASE 362. The one focus action: a project, and optionally one session. */
  focus: AgentAccessFocusHandler;
  /**
   * PHASE 362. Tortie's own summary for one session, or null. Injected so the
   * dispatcher never opens the overview store and a build with no store still
   * answers `state: 'none'` rather than failing.
   */
  readSummary: (sessionId: string) => AgentAccessStoredSummary | null;
  /** PHASE 362. False once the request expired or hung up. Default true. */
  isLive?: () => boolean;
  /** One structured line per completed/refused request. */
  report: (entry: {
    operation: AgentAccessOperation | 'unknown';
    outcome: string;
    durationMs: number;
  }) => void;
}

/** A handler behind the exhaustive operation registry. */
/** Every member one operation may carry, and nothing else. */
const OPERATION_MEMBERS: Record<AgentAccessOperation, readonly string[]> = {
  capabilities: ['version', 'operation', 'session'],
  whoami: ['version', 'operation', 'session'],
  sessions: ['version', 'operation', 'session', 'project'],
  activity: ['version', 'operation', 'session', 'project'],
  summaries: ['version', 'operation', 'session', 'project', 'sessions'],
  open: [
    'version',
    'operation',
    'session',
    'pathBase64',
    'line',
    'endLine',
    'findBase64'
  ],
  'open-project': ['version', 'operation', 'session', 'project', 'pathBase64'],
  create: ['version', 'operation', 'session', 'project', 'name', 'agent'],
  rename: ['version', 'operation', 'session', 'target', 'name'],
  focus: ['version', 'operation', 'session', 'project', 'target']
};

/** The validated body of one acting request, plus the read filter. */
interface AskedBody {
  callerId: string;
  /** The project filter a read may carry; undefined means every row. */
  projectId: string | undefined;
  /** The ids `summaries` names; null means the whole list. */
  wanted: readonly string[] | null;
}

function isIdMember(value: unknown): value is string {
  return isAgentAccessSessionId(value);
}

/**
 * Validate everything a NON-`open` operation carries beyond its operation
 * name. Unknown members are refused here, so `OPERATION_MEMBERS` is the one
 * list a new member has to be added to.
 */
function validateBody(
  operation: AgentAccessOperation,
  record: Record<string, unknown>
): AskedBody | null {
  const allowed = new Set(OPERATION_MEMBERS[operation]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return null;
  }
  const session = record['session'];
  if (!isAgentAccessSessionId(session)) return null;

  // The optional project filter, on the three list reads and on every acting
  // operation that names a project. A shape check only: whether that project
  // exists is the adapter's answer, and an unknown id reads as an empty list.
  const rawProject = record['project'];
  let projectId: string | undefined;
  if (rawProject !== undefined) {
    if (!isIdMember(rawProject)) return null;
    projectId = rawProject;
  }

  // open-project names an existing project XOR a folder path to open.
  if (operation === 'open-project') {
    const hasPath = record['pathBase64'] !== undefined;
    if (hasPath === (projectId !== undefined)) return null;
    if (hasPath && decodeCanonicalBase64(record['pathBase64'], MAX_PATH_BYTES) === null) {
      return null;
    }
  } else if (record['pathBase64'] !== undefined) {
    return null;
  }

  // Every other operation whose members name a project REQUIRES it.
  if (
    (operation === 'create' ||
      operation === 'focus') &&
    projectId === undefined
  ) {
    return null;
  }

  // The session a verb acts on, by id, required by rename.
  if (operation === 'rename') {
    if (!isIdMember(record['target'])) return null;
  }
  if (operation === 'focus' && record['target'] !== undefined) {
    if (!isIdMember(record['target'])) return null;
  }

  // A name, when the operation names something. Only the SHAPE is refused
  // here (a non-string, an empty one, or one past the field's own ceiling);
  // the shared name rule decides the reason, and the adapter answers it.
  // The name a session is given or renamed to: only a non-string is
  // malformed here. Empty, too long and character refusals are the app's
  // own `sessionNameRefusal` sentence, answered by the adapter.
  if (operation === 'create' || operation === 'rename') {
    if (typeof record['name'] !== 'string') return null;
  }

  // A create may name a compiled agent. Any string is a shape; whether it is
  // launchable is the registry's answer, in the adapter.
  if (operation === 'create' && record['agent'] !== undefined) {
    const agent = record['agent'];
    if (typeof agent !== 'string' || agent.length === 0 || agent.length > 64) {
      return null;
    }
  }

  let wanted: readonly string[] | null = null;
  if (operation === 'summaries') {
    const raw = record['sessions'];
    if (raw !== undefined) {
      if (
        !Array.isArray(raw) ||
        raw.length === 0 ||
        raw.length > AGENT_ACCESS_MAX_LISTED_ROWS
      ) {
        return null;
      }
      for (const one of raw) {
        if (!isAgentAccessSessionId(one)) return null;
      }
      wanted = raw as string[];
    }
  }
  return { callerId: session, projectId, wanted };
}

type OperationHandler = (
  deps: AgentAccessDispatchDeps,
  sources: AgentAccessFactSources,
  callerId: string,
  record: Record<string, unknown>,
  asked: AskedBody,
  invocation: AgentAccessOpenInvocation | null
) => Promise<AgentAccessResponse>;

/**
 * PHASE 362. The acting operations' caller rule: a fake id, a gone row or a
 * row on another machine reads `unavailable` before any verb runs. `open`
 * keeps its own rule inside its seam; the reads keep theirs in `facts.ts`.
 */
function gateLocalCaller(
  sources: AgentAccessFactSources,
  callerId: string
): AgentAccessResponse | null {
  if (findLocalCaller(sources.sessions, callerId) === null) {
    return fail('unavailable', UNAVAILABLE_MESSAGE);
  }
  return null;
}

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
  sessions: async (_deps, sources, callerId, _record, asked) => {
    const sessions = buildAgentAccessSessions(
      sources,
      callerId,
      asked.projectId
    );
    if (sessions === null) return fail('unavailable', UNAVAILABLE_MESSAGE);
    return { version: 1, ok: true, operation: 'sessions', value: sessions };
  },
  // PHASE 362. The plain-word activity board: waiting first, every other row
  // behind it, same session rows as `sessions`. Same caller rule as the facts
  // below: a fake/gone/remote caller reads `unavailable` and learns nothing.
  activity: async (_deps, sources, callerId, _record, asked) => {
    const activity = buildAgentAccessActivity(
      sources,
      callerId,
      asked.projectId
    );
    if (activity === null) return fail('unavailable', UNAVAILABLE_MESSAGE);
    return { version: 1, ok: true, operation: 'activity', value: activity };
  },
  // PHASE 362. Tortie's written record of what sessions did — never the
  // conversation (see What is NOT in this phase), never a model. A fake/gone
  // caller reads `unavailable`; a listed session with nothing kept reads
  // `state: 'none'` inside an honest ok:true.
  summaries: async (deps, sources, callerId, _record, asked) => {
    const summaries = buildAgentAccessSummaries(
      sources,
      callerId,
      asked.wanted,
      asked.projectId,
      deps.readSummary
    );
    if (summaries === null) return fail('unavailable', UNAVAILABLE_MESSAGE);
    return { version: 1, ok: true, operation: 'summaries', value: summaries };
  },
  open: async (deps, _sources, _callerId, _record, _asked, invocation) => {
    if (invocation === null) return fail('bad-request', BAD_REQUEST_MESSAGE);
    const value = await deps.open(invocation);
    return { version: 1, ok: true, operation: 'open', value };
  },
  // PHASE 362. The acting half: each adapter is an injected seam, exactly as
  // `open` is. The dispatcher validated the shape; the adapter decides the
  // answer. A fake, gone or remote caller is refused BEFORE any adapter runs,
  // so no verb is ever reached by a session that is not live on this Mac.
  'open-project': async (deps, sources, callerId, record) => {
    const gate = gateLocalCaller(sources, callerId);
    if (gate !== null) return gate;
    const rawPath = record['pathBase64'];
    const value = await deps.openProject({
      caller: callerId,
      ...(typeof record['project'] === 'string'
        ? { projectId: record['project'] }
        : {}),
      ...(typeof rawPath === 'string'
        ? { path: decodeCanonicalBase64(rawPath, MAX_PATH_BYTES) as string }
        : {})
    });
    return { version: 1, ok: true, operation: 'open-project', value };
  },
  create: async (deps, sources, callerId, record) => {
    const gate = gateLocalCaller(sources, callerId);
    if (gate !== null) return gate;
    const rawAgent = record['agent'];
    const value = await deps.create({
      caller: callerId,
      projectId: record['project'] as string,
      name: record['name'] as string,
      agent: typeof rawAgent === 'string' ? rawAgent : null
    });
    return { version: 1, ok: true, operation: 'create', value };
  },
  rename: async (deps, sources, callerId, record) => {
    const gate = gateLocalCaller(sources, callerId);
    if (gate !== null) return gate;
    const value = await deps.rename({
      caller: callerId,
      target: record['target'] as string,
      name: record['name'] as string
    });
    return { version: 1, ok: true, operation: 'rename', value };
  },
  focus: async (deps, sources, callerId, record) => {
    const gate = gateLocalCaller(sources, callerId);
    if (gate !== null) return gate;
    const rawTarget = record['target'];
    const value = await deps.focus({
      caller: callerId,
      projectId: record['project'] as string,
      target: typeof rawTarget === 'string' ? rawTarget : null
    });
    return { version: 1, ok: true, operation: 'focus', value };
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
    const askedName = record['operation'];
    if (
      typeof askedName !== 'string' ||
      !(AGENT_ACCESS_OPERATIONS as readonly string[]).includes(askedName)
    ) {
      response = fail('unknown-operation', UNKNOWN_OPERATION_MESSAGE);
      return response;
    }
    operation = askedName as AgentAccessOperation;
    // PHASE 362. Every non-`open` operation validates its own member set in
    // `validateBody`, so an unknown member on any of them is `bad-request`.
    let asked: AskedBody | null = null;
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
      const validated = validateBody(operation, record);
      if (validated === null) {
        response = fail('bad-request', BAD_REQUEST_MESSAGE);
        return response;
      }
      callerId = validated.callerId;
      asked = validated;
    }
    const sources: AgentAccessFactSources = {
      sessions: await deps.listSessions(),
      projects: await deps.listProjects()
    };
    // Recheck AFTER asynchronous source reads: a switch-off, transport shutdown
    // or expired queued Apple Event must not start an operation when reads finish.
    if (!deps.isEnabled()) {
      response = fail('disabled', DISABLED_MESSAGE);
      return response;
    }
    if (deps.isLive?.() === false) {
      response = fail('unavailable', UNAVAILABLE_MESSAGE);
      return response;
    }
    response = await OPERATION_HANDLERS[operation](
      deps,
      sources,
      callerId,
      record,
      asked ?? { callerId, projectId: undefined, wanted: null },
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
