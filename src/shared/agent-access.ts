/**
 * Phase 359 — the shared agent-access contract.
 *
 * ONE SPELLING, owned here. Every other builder imports from this file; nobody
 * re-spells the operation list, limits, environment name, row projection, or
 * wire union. Builder C1's socket parses framing only, its dispatch validates
 * against these types, and Builder C2's open path returns these values.
 *
 * Pure types and constants only: this file compiles into both processes under
 * tsconfig.shared.json (ES2023, no DOM, no Node), so it names no runtime
 * beyond the language itself.
 */

import type { SessionStatus } from './types';

/** The private-socket wire protocol version. Exactly 1. */
export const AGENT_ACCESS_PROTOCOL = 1 as const;

/** Pane environment name carrying the socket address. Exactly this. */
export const AGENT_ACCESS_SOCKET_ENV = 'GMUX_AGENT_SOCKET' as const;

/** The four allowlisted operations, in wire order. Exactly these. */
export const AGENT_ACCESS_OPERATIONS = [
  'capabilities',
  'whoami',
  'sessions',
  'open'
] as const;

/** One of the four operations a caller may ask for. */
export type AgentAccessOperation = (typeof AGENT_ACCESS_OPERATIONS)[number];

/** The only agents that ever receive launch delivery. Exactly these three. */
export const AGENT_ACCESS_DELIVERY_AGENTS = ['claude', 'pi', 'omp'] as const;

/** An agent id eligible for launch delivery. */
export type AgentAccessDeliveryAgent =
  (typeof AGENT_ACCESS_DELIVERY_AGENTS)[number];

/** Largest request body main reads: 64 KiB, plus one sentinel byte. */
export const AGENT_ACCESS_MAX_REQUEST_BYTES = 64 * 1024;
/** Largest response body main writes: 256 KiB. */
export const AGENT_ACCESS_MAX_RESPONSE_BYTES = 256 * 1024;
/** Absolute request deadline from accept, never reset by bytes: 2 s. */
export const AGENT_ACCESS_REQUEST_DEADLINE_MS = 2_000;
/** Newest-first session rows per `sessions` answer. Older rows are omitted. */
export const AGENT_ACCESS_MAX_SESSION_ROWS = 200;
/** Largest decoded open path, in bytes. */
export const AGENT_ACCESS_MAX_PATH_BYTES = 4_096;
/** Largest decoded open find string, in bytes. */
export const AGENT_ACCESS_MAX_FIND_BYTES = 4_096;

/**
 * Whether a claimed caller id is shaped like a session id: 1–128 ASCII
 * characters, leading alphanumeric, the rest alphanumeric, `-` or `_`.
 * Current UUID-shaped ids pass. This is shape, not authority: another process
 * under the same OS account can claim a live id, which is why the operations
 * below are read-only or show-only.
 */
export function isAgentAccessSessionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)
  );
}

/**
 * The lifecycle statuses that read as `finished`. Exactly exited, restorable
 * and discarded; every other existing status is `active`. This is a
 * projection for the session view, not a new member: it matches the finished
 * set main already uses elsewhere.
 */
export const AGENT_ACCESS_FINISHED_STATUSES = [
  'discarded',
  'exited',
  'restorable'
] as const satisfies readonly SessionStatus[];

/** True when the status reads as finished in an agent-access session view. */
export function isAgentAccessFinishedStatus(status: SessionStatus): boolean {
  return (AGENT_ACCESS_FINISHED_STATUSES as readonly string[]).includes(status);
}

/** Every request carries exactly these three members plus one locator. */
export interface AgentAccessBaseRequest {
  /** Always 1. */
  version: 1;
  operation: AgentAccessOperation;
  /** The caller's claimed `GMUX_SESSION_ID`. */
  session: string;
}

/**
 * The closed request union. The two `open` arms are mutually exclusive and
 * exhaustive: exactly `line` (with optional `endLine`) or exactly non-empty
 * `findBase64`.
 */
export type AgentAccessRequest =
  | { version: 1; operation: 'capabilities'; session: string }
  | { version: 1; operation: 'whoami'; session: string }
  | { version: 1; operation: 'sessions'; session: string }
  | {
      version: 1;
      operation: 'open';
      session: string;
      pathBase64: string;
      line: number;
      endLine?: number;
    }
  | {
      version: 1;
      operation: 'open';
      session: string;
      pathBase64: string;
      findBase64: string;
    };

/** Closed transport error codes. No filesystem or session detail rides one. */
export type AgentAccessErrorCode =
  | 'disabled'
  | 'unknown-operation'
  | 'bad-request'
  | 'unavailable';

/** The closed response union: one JSON line, never echoing request bytes. */
export type AgentAccessResponse =
  | {
      version: 1;
      ok: true;
      operation: AgentAccessOperation;
      value: AgentAccessOperationResult;
    }
  | {
      version: 1;
      ok: false;
      error: { code: AgentAccessErrorCode; message: string };
    };

/** One operation's answer. The discriminator is the request's operation. */
export type AgentAccessOperationResult =
  | AgentAccessCapabilitiesValue
  | AgentAccessWhoAmIValue
  | AgentAccessSessionsValue
  | AgentAccessOpenValue;

/** `capabilities`: what this door is and what it answers. */
export interface AgentAccessCapabilitiesValue {
  protocol: 1;
  tortieVersion: string;
  enabled: true;
  operations: readonly ['capabilities', 'whoami', 'sessions', 'open'];
  deliveredTo: readonly ['claude', 'pi', 'omp'];
}

/** `whoami`: the caller's own curated row. */
export interface AgentAccessWhoAmIValue {
  session: AgentAccessSessionView;
}

/** `sessions`: newest-first rows plus the count the 200 cap cut. */
export interface AgentAccessSessionsValue {
  sessions: AgentAccessSessionView[];
  omitted: number;
}

/**
 * The editor selection an accepted `open` carries. Lines are 1-based;
 * columns are 0-based UTF-16 offsets; `endColumn` is exclusive; the range
 * always flashes once on arrival. This mirrors the renderer's coordinate
 * contract without importing it: Builder C2 maps this onto
 * `OpenFileRequest['selection']` at the single arrival site.
 */
export interface AgentAccessOpenSelection {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  highlight: true;
}

/** `open`: opened, no match, or a closed refusal reason. */
export type AgentAccessOpenValue =
  | {
      state: 'opened';
      project: AgentAccessProjectView;
      path: string;
      selection: AgentAccessOpenSelection;
      matches?: number;
      chosen?: 1;
    }
  | { state: 'not-found'; matches: 0 }
  | {
      state: 'refused';
      reason:
        | 'no-project'
        | 'outside-projects'
        | 'missing'
        | 'not-file'
        | 'credential'
        | 'not-text'
        | 'too-large'
        | 'changed'
        | 'line-out-of-range'
        | 'renderer-unavailable';
    };

/**
 * The curated project projection. Id, display name and absolute path only:
 * never manifest records, capture records, environment or login names.
 */
export interface AgentAccessProjectView {
  id: string;
  name: string;
  path: string;
}

/** The curated machine projection: `local` for this Mac. */
export interface AgentAccessMachineView {
  /** 'local' for this Mac; the recorded machine id otherwise. */
  id: string;
  /** 'This Mac' for local; the recorded machine label otherwise. */
  label: string;
}

/**
 * The curated session projection. Never argv, resume argv, conversation ids,
 * terminal bytes, or paths outside the project/session pair.
 */
export interface AgentAccessSessionView {
  id: string;
  name: string;
  agent: string;
  status: SessionStatus;
  phase: 'active' | 'finished';
  createdAt: number;
  project: AgentAccessProjectView | null;
  machine: AgentAccessMachineView;
}

/**
 * The seam Builder C1's dispatch calls into Builder C2's open operation
 * through (Phase 359 §3). C1 imports this type only: it never edits C2's
 * files and never chooses filesystem or UI policy. The locator is decoded
 * but otherwise unvalidated here; C2 validates and returns the closed value.
 */
export interface AgentAccessOpenInvocation {
  session: string;
  pathBase64: string;
  line?: number;
  endLine?: number;
  findBase64?: string;
}

/** C2's open operation, injected into C1's dispatch. */
export type AgentAccessOpenHandler = (
  invocation: AgentAccessOpenInvocation
) => Promise<AgentAccessOpenValue>;
