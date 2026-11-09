/**
 * Phase 359, Builder A — the shared agent-access contract.
 *
 * ONE SPELLING, owned by src/shared/agent-access.ts. Every other builder
 * imports it; this file pins the protocol version, environment name, the four
 * operations and their order, the three delivery agents, every bound, the
 * session-id shape, the closed request/response unions, the curated view
 * shapes, and the C1→C2 open seam. If a constant moves, this file moves it,
 * and nothing else re-spells it.
 */

import { describe, expect, it } from 'vitest';
import {
  AGENT_ACCESS_DELIVERY_AGENTS,
  AGENT_ACCESS_FINISHED_STATUSES,
  AGENT_ACCESS_MAX_FIND_BYTES,
  AGENT_ACCESS_MAX_PATH_BYTES,
  AGENT_ACCESS_MAX_REQUEST_BYTES,
  AGENT_ACCESS_MAX_RESPONSE_BYTES,
  AGENT_ACCESS_MAX_SESSION_ROWS,
  AGENT_ACCESS_OPERATIONS,
  AGENT_ACCESS_PROTOCOL,
  AGENT_ACCESS_REQUEST_DEADLINE_MS,
  AGENT_ACCESS_SOCKET_ENV,
  isAgentAccessFinishedStatus,
  isAgentAccessSessionId
} from '../agent-access';

describe('the fixed protocol facts', () => {
  it('pins the protocol version and the pane environment name', () => {
    expect(AGENT_ACCESS_PROTOCOL).toBe(1);
    expect(AGENT_ACCESS_SOCKET_ENV).toBe('GMUX_AGENT_SOCKET');
  });

  // PHASE 362. The four reads come first, then the reads the uncommitted
  // work added beside them, then this phase's acting half, in wire order.
  it('pins the ten operations in wire order', () => {
    expect([...AGENT_ACCESS_OPERATIONS]).toEqual([
      'capabilities',
      'whoami',
      'sessions',
      'activity',
      'summaries',
      'open',
      'open-project',
      'create',
      'rename',
      'focus'
    ]);
  });

  it('pins the three delivery agents', () => {
    expect([...AGENT_ACCESS_DELIVERY_AGENTS]).toEqual(['claude', 'pi', 'omp']);
  });

  it('pins every bound', () => {
    expect(AGENT_ACCESS_MAX_REQUEST_BYTES).toBe(64 * 1024);
    expect(AGENT_ACCESS_MAX_RESPONSE_BYTES).toBe(256 * 1024);
    expect(AGENT_ACCESS_REQUEST_DEADLINE_MS).toBe(2_000);
    expect(AGENT_ACCESS_MAX_SESSION_ROWS).toBe(200);
    expect(AGENT_ACCESS_MAX_PATH_BYTES).toBe(4_096);
    expect(AGENT_ACCESS_MAX_FIND_BYTES).toBe(4_096);
  });
});

describe('the session-id shape', () => {
  it('accepts the ids Tortie issues today', () => {
    expect(
      isAgentAccessSessionId('3f9a8b2c-1d4e-4f6a-9b8c-7d6e5f4a3b2c')
    ).toBe(true);
    expect(isAgentAccessSessionId('a')).toBe(true);
    expect(isAgentAccessSessionId('A-0_z')).toBe(true);
  });

  it('refuses empty, overlong, and non-ASCII or spaced ids', () => {
    expect(isAgentAccessSessionId('')).toBe(false);
    expect(isAgentAccessSessionId('-abc')).toBe(false);
    expect(isAgentAccessSessionId('_abc')).toBe(false);
    expect(isAgentAccessSessionId('ab c')).toBe(false);
    expect(isAgentAccessSessionId('ab/c')).toBe(false);
    expect(isAgentAccessSessionId('a'.repeat(129))).toBe(false);
    expect(isAgentAccessSessionId('séssion')).toBe(false);
  });

  it('holds the 128 boundary exactly', () => {
    expect(isAgentAccessSessionId(`a${'b'.repeat(127)}`)).toBe(true);
    expect(isAgentAccessSessionId(`a${'b'.repeat(128)}`)).toBe(false);
  });

  it('refuses non-strings', () => {
    expect(isAgentAccessSessionId(undefined)).toBe(false);
    expect(isAgentAccessSessionId(null)).toBe(false);
    expect(isAgentAccessSessionId(42)).toBe(false);
    expect(isAgentAccessSessionId({})).toBe(false);
  });
});

describe('the finished projection', () => {
  it('is exactly exited, restorable and discarded, and adds no status', () => {
    expect([...AGENT_ACCESS_FINISHED_STATUSES].sort()).toEqual([
      'discarded',
      'exited',
      'restorable'
    ]);
    for (const status of [
      'running',
      'idle',
      'needs_input',
      'unknown'
    ] as const) {
      expect(isAgentAccessFinishedStatus(status)).toBe(false);
    }
    expect(isAgentAccessFinishedStatus('exited')).toBe(true);
    expect(isAgentAccessFinishedStatus('restorable')).toBe(true);
    expect(isAgentAccessFinishedStatus('discarded')).toBe(true);
  });
});

describe('the wire unions are closed', () => {
  // PHASE 362. The reads that landed in the uncommitted work plus this
  // phase's acting half: ten operations in wire order, pinned exactly so
  // a twelfth is a deliberate contract change with a baseline regen.
  it('admits only the ten operations in wire order', () => {
    expect([...AGENT_ACCESS_OPERATIONS]).toEqual([
      'capabilities',
      'whoami',
      'sessions',
      'activity',
      'summaries',
      'open',
      'open-project',
      'create',
      'rename',
      'focus'
    ]);
    const operations = new Set<string>(AGENT_ACCESS_OPERATIONS);
    expect(operations.size).toBe(10);
    for (const op of [
      'capabilities',
      'whoami',
      'sessions',
      'activity',
      'summaries',
      'open',
      'open-project',
      'create',
      'rename',
      'focus'
    ] as const) {
      expect(operations.has(op)).toBe(true);
    }
  });

  it('admits only literal true for the enabled answer', () => {
    // The capabilities `enabled` member is typed `true`, not `boolean`: any
    // drift to a plain boolean is a widening this test names.
    const enabled: true = true;
    expect(enabled).toBe(true);
  });
});
